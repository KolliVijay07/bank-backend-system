const express = require('express')
const accountController = require("../controllers/account.controller")
const authMiddleware = require('../middleware/auth.middleware')
const router = express.Router()
// /api/accounts/ post method 
// creating a new account
router.post('/',authMiddleware.authMiddleware,accountController.createAccount)

// get all accounts of a user
router.get("/",authMiddleware.authMiddleware,accountController.getAllAccounts)

// get balance of a specific account
router.get("/balance/:id",authMiddleware.authMiddleware,accountController.getAccountBalance)
module.exports = router