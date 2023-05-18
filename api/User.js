const express = require("express")
const router = express.Router()
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")
require("dotenv").config();
const {v4: uuidv4} = require("uuid")
const jwt = require("jsonwebtoken")

const User = require("./../models/User")
const UserVerification = require("./../models/UserVerification")


let transporter = nodemailer.createTransport({
service: 'gmail',
host: 'smtp.example.com',
port: 587,
secure: false,
tls: {
    rejectUnauthorized: false
},
auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS
}
});

router.post("/signup", (req,res) =>{
    let {name, email, password, phone} = req.body
    name = name.trim()
    email = email.trim()
    password = password.trim()
    phone = phone.trim()

    if(name == "" || email == "" || password == ""){
        res.json({
            status: "Failed",
            message: "Empty input fields!"
        })
    }else if (!/^[a-zA-Z]*$/.test(name)){
        res.json({
            status: "Failed",
            message: "Invalid name entered"
        })
    }else if( !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)){
        res.json({
            status: "Failed",
            message: "Invalid email entered"
        })
    } else if(password.length < 8){
        res.json({
            status: "Failed",
            message: "Password is too short!"
        })
    } else {
        User.findOne({email}).then(result => {
            if (result){
                res.json({
                    status: "Failed",
                    message: "Email already register"
                })
            } else{

                const saltRounds = 10
                bcrypt.hash(password, saltRounds).then(hashedPassword =>{
                    const newUser= new User({
                        name,
                        email,
                        password : hashedPassword,
                        phone,
                        verified: false,
                    })

                    newUser.save().then( result =>{
                        
                        //cargar las opciones del transporter y transporter.sendMail 
                        sendVerificationEmail(result, res, "verify")
                    }).catch(err =>{
                        res.json({
                            status: "Failed",
                            message: "An error ocurred while creating user"
                        })
                    })
                }).catch(err =>{
                    res.json({
                        status: "Failed",
                        message: "An error ocurred while hashing password"
                    })
                })
            }
        }).catch((err) => {
            console.log(err)
            res.json({
                status: "Failed",
                message: "An error ocurred while checking for email"
            })
        })
    }
})

const sendVerificationEmail = ({_id, email}, res, route) =>{
    const currentUrl = "http://localhost:5173/"
    let subject ="";
    let paragraphMessage = "";
    if(route === "forgot"){
        subject = "Reset your password!";
        paragraphMessage ="If you requested a new password please proced with the link, otherwise contact out team and do not click the link.";
    }else{
        subject = "Verifiy your email!";
        paragraphMessage ="Verify your email address to complete the signup and login into your account.";
    }
   
    const uniqueString = uuidv4() + _id
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: subject,
        html: `
        <p>${paragraphMessage}</p>
        <p>This link <b>expires in 6 hours.</b></p>
        <p>Press <a href="${currentUrl + "user/"+ route +"/?id=" + _id + "&string=" + uniqueString}">here</a> to proceed</p>`
        
    };

    const saltRounds = 10
    bcrypt.hash(uniqueString, saltRounds)
    .then((hashedUniqueString) =>{
        const newVerification = new UserVerification({
            userId: _id,
            uniqueString: hashedUniqueString,
            createdAt: Date.now(),
            expiredAt: Date.now() + 21600000
        })
        newVerification.save()
        .then(() =>{
            transporter.sendMail(mailOptions)
            .then(() => {
                res.json({
                    status: "Pending",
                    message: "Verification email sent"
                })
            })
            .catch((err) => {
                console.log(err)
                res.json({
                    status: "Failed",
                    message: "An error ocurred while sending the email"
                })
            }) 
        })
        .catch((err) =>{
            console.log(err);
            res.json({
                status: "Failed",
                message: "An error ocurred while creating verification"
            })
        })
    })
    .catch((err) =>{
        res.json({
            status: "Failed",
            message: "An error ocurred while hashing data"
        })
    })
}

//Verify email
router.get("/verify/:userId/:uniqueString", (req,res) =>{
    let {userId, uniqueString} = req.params;
    UserVerification.find({userId})
    .then((result) =>{
        if(result.length > 0){
            const {expiredAt} = result[0];
            const hashedUniqueString = result[0].uniqueString

            if(expiredAt < Date.now()){
                UserVerification.deleteOne({userId})
                .then(result =>{
                    User.deleteOne({_id: userId})
                    .then(() =>{
                        res.json({
                            status: "Failed",
                            message: "The link has expired. Please sign up again."
                        })
                    })
                    .catch((err) =>{
                        res.json({
                            status: "Failed",
                            message: "An error ocurred while deleting user verification"
                        })
                    })
                })
                .catch((err)=>{
                    res.json({
                        status: "Failed",
                        message: "An error ocurred while checking if verification expires"
                    })
                })
            }else{
                //valid user verification
                bcrypt.compare(uniqueString, hashedUniqueString)
                .then(result =>{
                    if(result){
                       User.updateOne({_id: userId}, {verified: true})
                       .then(() =>{
                        UserVerification.deleteOne({userId})
                        .then(() =>{
                            /* res.json({
                                status: "Success",
                                message: "Email verified!"
                            }) */
                            res.redirect("http://127.0.0.1:5173/verified")
                        })
                        .catch((err) =>{
                            res.json({
                                status: "Failed",
                                message: "An error ocurred while deleting verification model"
                            })
                        })
                       })
                       .catch((err) =>{
                            console.log(err)
                            res.json({
                                status: "Failed",
                                message: "An error ocurred while updating verified property"
                            })
                       }) 
                    }else{
                        res.json({
                            status: "Failed",
                            message: "Incorrect verification details passed"
                        })
                    }
                })
                .catch((err) =>{
                    res.json({
                        status: "Failed",
                        message: "Wrong verification email"
                    })
                })
            }

        }else{
            res.json({
                status: "Failed",
                message: "Email already verified or never used"
            })
        }
    }) 
    .catch((err) =>{
        console.log(err)
        res.json({
            status: "Failed",
            message: "An error ocurred while verifing email"
        })
    })
})

router.post("/signin", (req,res) =>{
    let {email, password} = req.body
    email = email.trim()
    password = password.trim()

    if(email == "" || password == ""){
        res.json({
            status: "Failed",
            message: "Empty credentials"
        })
    }else{
        User.find({email}).then(data =>{
            
            if(data){

                if(!data[0].verified){
                    res.json({
                        status: "Failed",
                        message: "Email not verified"
                    })
                } else{
                    const hashedPassword = data[0].password
                    bcrypt.compare(password, hashedPassword).then(result =>{
                        if(result){
                            
                            const _id = data[0]._id
                            const token = jwt.sign({id:_id}, process.env.SECRET_KEY_JWT, {})
                            /*En el front recibo el token y lo almaceno en algun lugar, cambiar data por un objeto solo con el nombre, email y telefono.*/
                            res.status(200).json({
                                status: "success",
                                message:"Signin successful",
                                data: data,
                                token: token
                            })
                        }else{
                            res.json({
                                status: "Failed",
                                message: "Invalid credentials"
                            })
                            
                        }
                    }).catch(err =>{
                        res.json({
                            status: "Failed",
                            message: "Error ocurred while checking credentials"
                        })
                    })
                }                
            } else{
                res.json({
                    status: "Failed",
                    message: "Invalid credentials"
                })
            }
        }).catch(err =>{
            res.json({
                status: "Failed",
                message: "Error while checking credentials"
            })
        })
    }
})

router.post("/forgot/:userId/:uniqueString", (req,res) =>{
    let {userId, uniqueString} = req.params;
    let { newPassword } = req.body
    console.log(newPassword)
    UserVerification.findOne({userId})
    .then((result) =>{
        if(result){
            const {expiredAt} = result;
            const hashedUniqueString = result.uniqueString

            if(expiredAt < Date.now()){
                UserVerification.deleteOne({userId})
                .then(result =>{
                    User.deleteOne({_id: userId})
                    .then(() =>{
                        res.json({
                            status: "Failed",
                            message: "The link has expired. Please sign up again."
                        })
                    })
                    .catch((err) =>{
                        res.json({
                            status: "Failed",
                            message: "An error ocurred while deleting user verification"
                        })
                    })
                })
                .catch((err)=>{
                    res.json({
                        status: "Failed",
                        message: "An error ocurred while checking if verification expires"
                    })
                })
            }else{
                //valid user verification
                bcrypt.compare(uniqueString, hashedUniqueString)
                .then(result =>{
                    if(result){
                        const saltRounds = 10
                        bcrypt.hash(newPassword, saltRounds).then(hashedPassword =>{
                            User.updateOne({_id: userId}, {password: hashedPassword})
                            .then(() =>{
                             UserVerification.deleteOne({userId})
                             .then(() =>{
                                 res.json({
                                     status: "Success",
                                     message: "Password changed!"
                                 })
                             })
                             .catch((err) =>{
                                 res.json({
                                     status: "Failed",
                                     message: "An error ocurred while deleting verification model"
                                 })
                             })
                            })
                            .catch((err) =>{
                                 console.log(err)
                                 res.json({
                                     status: "Failed",
                                     message: "An error ocurred while updating verified property"
                                 })
                            }) 
                        }).catch(err =>{
                            res.json({
                                status: "Failed",
                                message: "An error ocurred while hashing password"
                            })
                        })
                       
                    }else{
                        res.json({
                            status: "Failed",
                            message: "Incorrect verification details passed"
                        })
                    }
                })
                .catch((err) =>{
                    res.json({
                        status: "Failed",
                        message: "Wrong verification email"
                    })
                })
            }

        }else{
            res.json({
                status: "Failed",
                message: "Email already verified or never used"
            })
        }
    }) 
    .catch((err) =>{
        console.log(err)
        res.json({
            status: "Failed",
            message: "An error ocurred while verifing email"
        })
    })
})

router.post("/forgot", async (req,res) =>{
    const {email} = req.body;

    const user = await User.findOne({email})
    if(!user){
        res.json({
            status: "Failed",
            message: "Invalid credentials"
        })
    }

    try {
        sendVerificationEmail(user, res, "forgot")
    } catch (err) {
        console.log(err)
    }
})

router.post("/verifytoken", async (req,res) =>{
    const {token} = req.body;
    if(!token){
        res.json({
            status: "Failed",
            message: "Invalid credentials"
        })
    }else{
        try {
            const decoded = jwt.verify(token, process.env.SECRET_KEY_JWT)
            if(decoded){
                const user = await User.findById(decoded.id)
                res.json({
                    status: "Verified!",
                    message: "Valid token!",
                    data: {name: user.name, email: user.email, phone: user.phone}
                })
            }else{
                res.json({
                    status: "Failed",
                    message: "Invalid token"
                })
            }
        } catch (error) {
            console.log(error)
        }
        
        return
    }
})


module.exports = router