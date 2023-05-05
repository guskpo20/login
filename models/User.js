const { Schema } = require("mongoose")
const mongoose = require("mongoose")


const UserSchema = new Schema({
    name: String,
    email: String,
    password: String,
    phone: String,
    verified: Boolean
})

const User = mongoose.model("User", UserSchema)

module.exports = User