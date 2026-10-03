const mongoose = require('mongoose')

const tokenBlackListSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "Token is required to create a  blacklist entry"],
        unique: true
    }
},{
    timestamps : true
})

tokenBlackListSchema.index( //Time to Live
    {createdAt:1}, // this is a TTL index, it will automatically remove the token entry from databse after 3 days
    {expireAfterSeconds : 60 * 60 * 24 * 3} // (60 sec * 60 min * 24 hours * 3) days
)

const tokenBlackListModel = mongoose.model('tokenBlackList',tokenBlackListSchema)

module.exports = tokenBlackListModel
  