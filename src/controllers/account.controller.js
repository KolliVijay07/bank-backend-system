const accountModel = require("../models/account.model")
const mongoose = require("mongoose")

async function createAccount(req,res) {
    const user = req.user
    console.log(user)
    const existingAccount = await accountModel.findOne({ // check whether the user already created the account
        user: user._id
    }).lean();
// using lean() makes it 50% to 70% faster in Node.js: returns plain JavaScript objects
    if (existingAccount) {
        return res.status(409).json({
            message: "Account already exists",
            account: existingAccount
        });
    }
    const account = await accountModel.create({
        user:user._id
    })
    res.status(201).json({
        message:"Account created Successfully!!!",
        account
    })
}

async function getAllAccounts(req,res){
    const user = req.user
    const accounts = await accountModel.find({
        user:user._id
    }).lean()
    res.status(200).json({
        message:"Accounts fetched Successfully!!!",
        accounts
    })
}

async function getAccountBalance(req,res){
    const user = req.user
    const {id} = req.params
    if(!mongoose.Types.ObjectId.isValid(id)){
        return res.status(400).json({message:"Invalid Account ID"})
    }
    const account = await accountModel.findOne({
        user:user._id,
        _id:id
    })
    if(!account){
        return res.status(404).json({message:"Account not found"})
    }
    const balance = await account.getBalance()
    res.status(200).json({
        message:"Account balance fetched Successfully!!!",
        accountId:account._id,
        balance
    })
}
module.exports = {createAccount,getAllAccounts,getAccountBalance}