const { Schema } = require("mongoose")
const mongoose = require("mongoose")


const UserVerificationSchema = new Schema({
    userId: String,
    uniqueString: String,
    createdAt: Date,
    expiredAt: Date
})

const UserVerification = mongoose.model("UserVerification", UserVerification)

module.exports = UserVerification