const express = require('express')
const authController = require("../controllers/auth.controller")
const router = express.Router()
// /api/auth/register post method
router.post('/register',authController.userRegister)
// /api/auth/login post method
router.post('/login',authController.userLogin)

// /api/auth/logout post method
router.post('/logout',authController.userLogout)

module.exports = router