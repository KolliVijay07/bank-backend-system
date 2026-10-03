const express = require('express'); 
const cookieParser = require('cookie-parser')
const authRoutes = require('./routes/auth.routes') //requiring routes
const accountRoutes = require('./routes/account.routes')
const transactionRoutes = require('./routes/transaction.routes')

const app = express()

app.use(express.json()) // middleware to parse the data in req.body to json()
app.use(cookieParser()) // middleware to use the cookieParser

app.get("/",(req,res)=>{
    return res.status(200).json({
        message : "Server is up and Running"
    })
})

app.use("/api/auth",authRoutes) // using routes
app.use("/api/accounts",accountRoutes)
app.use("/api/transactions",transactionRoutes)

module.exports = app

