const userModel = require("../models/user.model")
const jwt = require('jsonwebtoken')
const tokenBlackListModel = require("../models/blackList.model")

async function authMiddleware(req,res,next){
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]
    if (!token) {
        return res.status(401).json({message: "Unauthorized access, token is missing"})
    }
    const tokenBlackListed = await tokenBlackListModel.findOne({token}).lean()
    if(tokenBlackListed){
        return res.status(401).json({message: "Unauthorized access, token is invalid"})
    }
    try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET)
        const user = await userModel.findById(decoded.userId).select('-password')
        if(!user){
            return res.status(401).json({message: "Unauthorized access, user not found"})
        }

        req.user = user

        return next()
    }catch (err){
        return res.status(401).json({message: "Unauthorized access, token is invalid"})
    }
}
async function authSystemMiddleware(req,res,next) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]
    if (!token) {
        return res.status(401).json({message: "Unauthorized access, token is missing"})
    }
    const tokenBlackListed = await tokenBlackListModel.findOne({token}).lean()
    if(tokenBlackListed){
        return res.status(401).json({message: "Unauthorized access, token is invalid"})
    }
    try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET)
        const user = await userModel.findById(decoded.userId).select('+systemUser') // since we have done select:false in schema
        if(!user){
            return res.status(401).json({message: "Unauthorized access, user not found"})
        }
        if(!user.systemUser){
            return res.status(403).json({message: "Forbidden access, you are not system user"})
        }

        req.user = user

        return next()
    }catch (err){
        return res.status(401).json({message: "Unauthorized access, token is invalid"})
    }  
}
module.exports = {authMiddleware,authSystemMiddleware}
