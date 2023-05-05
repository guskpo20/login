const express = require("express")
const router = express.Router()
const bcrypt = require("bcrypt")
const nodemailer = require("nodemailer")
const {v4: uuidv4} = require("uuid")
require("dotenv").config();
const {google} = require("googleapis")
const OAuth2 = google.auth.OAuth2

const User = require("./../models/User")
const UserVerification = require("./../models/UserVerification")



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
                        res.json({
                            status: "Succes",
                            message: "Sign up succssfull",
                            data: result,
                        })
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
            //chequear Verificado con && data[0].verified
            if(data){
                const hashedPassword = data[0].password
                bcrypt.compare(password, hashedPassword).then(result =>{
                    if(result){
                        res.json({
                            status: "success",
                            message:"Signin successful",
                            data: data
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

module.exports = router