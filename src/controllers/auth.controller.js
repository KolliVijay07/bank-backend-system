const userModel = require("../models/user.model")
const jwt = require('jsonwebtoken')
const emailService = require('../services/email.service')
const tokenBlackListModel = require("../models/blackList.model")

// /api/auth/register post method
// user register controller
async function userRegister(req,res) {
    const {email,password,name} = req.body
    if(!email || !password || !name){
        return res.status(400).json({
            message : "Missing Fields, Please Enter all Fields!",
            status : "failed"
        })
    }
    const isUserAlreadyExists = await userModel.findOne({email})
    if(isUserAlreadyExists){
        return res.status(409).json({
            message : "User Already Exists!",
            status : "failed"
        })
    }   
    const user = await userModel.create({
        email,password,name
    })
    const token = jwt.sign({
        userId : user._id,
    },process.env.JWT_SECRET,{expiresIn:'3d'})
    res.cookie("token",token)
    res.status(201).json({
        message : "User Registered Successfully",
        user :{
            _id:user._id,
            email:user.email,
            name:user.name,
        },
        token
    })
    await emailService.sendRegistrationEmail(user.email,user.name)
}
// user login contoller
// /api/auth/login post method
async function userLogin(req,res) {
    const {email,password} = req.body //user can login using username & pass or email & pass
    if(!email || !password){
        return res.status(400).json({
            message : "Missing Fields, Please Enter all Fields!"
        })
    }
    const user = await userModel.findOne({email}).select('+password') // explictly include password
    if(!user){
        return res.status(401).json({
            message : "Invalid Credentails!"
        })
    }
    // const isPasswordValid = await bcrypt.compare(password,user.password)
    const isPasswordValid = await user.comparePassword(password)
    if(!isPasswordValid){
        return res.status(401).json({
            message : "Invalid Password!!"
        })
    }
    const token = jwt.sign({
        userId:user._id,
    },process.env.JWT_SECRET,{expiresIn:'3d'})
    res.cookie("token",token)
    res.status(200).json({
        message : "User Logged in Successfully",
        user :{
            _id:user._id,
            email:user.email,
            name:user.name,
        }
    })
}
// user logout controller
// /api/auth/logout post method
async function userLogout(req,res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]
    if(!token){
        return res.status(401).json({
            message : "Token is not found",
            status : "failed"
        })
    }
    
    try {
        await tokenBlackListModel.create({
            token
        })
    } catch (err) {
        // Token already blacklisted or duplicate
        // say that we have error
        if(err.code === 11000){
            return res.status(409).json({
                message : "Token already blacklisted!",
                status : "failed"
            })
        }
        return res.status(500).json({
            message : "Internal Server Error!",
            status : "failed"
        })
    }
    res.clearCookie("token")
    return res.status(200).json({
        message : "User Logged out Successfully",
        status : "success"
    })
}
module.exports = {userRegister,userLogin,userLogout}   