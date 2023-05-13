require("./config/db")
const app = require("express")()
const port = process.env.PORT || 8000
const UserRouter = require("./api/User")

const bodyParser = require("express").json


app.set('trust proxy', 1);
app.use(bodyParser())
// Add headers before the routes are defined
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.header('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE, OPTIONS');

    // Request headers you wish to allow
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Authorization, X-API-KEY, Origin, Access-Control-Allow-Requested-Method, Content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.header('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});


app.use("/user", UserRouter)


app.listen(port, ()=>{
    console.log("Server running on port " + port)
})