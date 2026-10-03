const emailService = require('../services/email.service')
const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const mongoose = require('mongoose')

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
 * 1. Validate request
 * 2. Validate idempotency key
 * 3. Check account status
 * 4. Derive sender balance from ledger
 * 5. Create transaction (PENDING)
 * 6. Create DEBIT ledger entry
 * 7. Create CREDIT ledger entry
 * 8. Mark transaction COMPLETED
 * 9. Commit MongoDB session
 * 10. Send email notification
 */
async function createTransaction(req, res) {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    /*
    1. Validating Request
    */
    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "Missing Fields, Please Enter all Fields!"
        })
    }

    if (fromAccount === toAccount) {
        return res.status(400).json({
            message: "Source account and destination account cannot be the same"
        })
    }

    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
            message: "Amount must be a positive number"
        })
    }

    if (!mongoose.Types.ObjectId.isValid(fromAccount) || !mongoose.Types.ObjectId.isValid(toAccount)) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount format"
        })
    }

    const fromUserAccount = await accountModel.findOne({ _id: fromAccount })
    const toUserAccount = await accountModel.findOne({ _id: toAccount }).populate('user', 'name')

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid fromUserAccount or toUserAccount"
        })
    }

     // Security: Check ownership of fromAccount
    if (fromUserAccount.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            message: "Unauthorized: You do not own the source account"
        })
    }

    /*
    2. Checking IdempotencyKey
    */
    const isTransactionExists = await transactionModel.findOne({ idempotencyKey })
    if (isTransactionExists) {
        if (isTransactionExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction Already Completed, Cannot be done Again!",
                transaction: isTransactionExists
            })
        }
        if (isTransactionExists.status === "PENDING") {
            return res.status(400).json({
                message: "Transaction is still Processing, Please wait for Transaction to Complete",
                transaction: isTransactionExists
            })
        }
        if (isTransactionExists.status === "FAILED") {
            return res.status(400).json({
                message: "Transaction Already Failed, Please try Again!",
                transaction: isTransactionExists
            })
        }
        if (isTransactionExists.status === "ROLLED_BACK") {
            return res.status(400).json({
                message: "Transaction Already Rolled Back, Please try Again!",
                transaction: isTransactionExists
            })
        }
        return res.status(400).json({
            message: "Transaction Already Exists!"
        })
    }

    /*
    3. Checking Account Status
    */
    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Accounts are Not Active, Please Activate Accounts to Perform Transaction"
        })
    }

    /*
    4. Derive sender balance from ledger
    */
    const balance = await fromUserAccount.getBalance()
    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient Balance. Available balance is ${balance}, but required balance is ${amount}`
        })
    }

    /*
    5 - 9. MongoDB Transaction & Ledger Entries
    */
    const session = await mongoose.startSession()
    try {
        session.startTransaction()

        const [transaction] = await transactionModel.create([{
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status : "PENDING"
        }],{session})
        await ledgerModel.create([{
            transaction: transaction._id,
            account: fromAccount,
            type: "DEBIT",
            amount: amount
        }], { session })

        //adding a promise so that it takes 10 sec after debit is done
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await ledgerModel.create([{
            transaction: transaction._id,
            account: toAccount,
            type: "CREDIT",
            amount: amount
        }], { session })

        transaction.status = 'COMPLETED'
        await transaction.save({ session })

        await session.commitTransaction()
        session.endSession()

        // 10. Send Email Notification
        const recipientName = toUserAccount.user?.name || toAccount
        await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, recipientName)

        return res.status(201).json({
            message: "Transaction Completed Successfully",
            transaction
        })
    } catch (err) {
        await session.abortTransaction()
        session.endSession()
        console.error("Transaction Error:", err)

        const recipientName = toUserAccount?.user?.name || toAccount
        await emailService.sendTransactionFailureEmail(req.user.email, req.user.name, amount, recipientName)

        return res.status(500).json({ 
            message: "Internal Server Error or Transaction is under processing,if you have intiated payment before"
        })
    }
}

async function createInitialFundsTransaction(req,res) {
    const {toAccount, amount, idempotencyKey} = req.body
    if(!toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message : "Missing Fields, Please Enter all Fields!"
        })
    }
    if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
            message: "Amount must be a positive number"
        })
    }
    if (!mongoose.Types.ObjectId.isValid(toAccount)) {
        return res.status(400).json({
            message: "Invalid toAccount format"
        })
    }
    const isTransactionExists = await transactionModel.findOne({ idempotencyKey })
    if (isTransactionExists) {
        return res.status(200).json({
            message: "Initial funds already credited",
            transaction: isTransactionExists
        })
    }
    
    const toUserAccount = await accountModel.findOne({_id:toAccount})
    if(!toUserAccount){
        return res.status(404).json({
            message : "Account Not Found!"
        })
    }
    if(toUserAccount.status !== "ACTIVE"){
        return res.status(400).json({
            message : "Recipient account is not active"
        })
    }
    const fromUserAccount = await accountModel.findOne({
        user:req.user._id})
    if(!fromUserAccount){ // just in case, as system user will always be present
        return res.status(400).json({
            message : "System Account Not Found!"
        })
    }
    
    const session = await mongoose.startSession()
    try {
        session.startTransaction()
        const [transaction] = await transactionModel.create([{
            fromAccount : fromUserAccount._id,
            toAccount,
            amount,
            idempotencyKey,
            status : "PENDING"
        }],{session})


        await ledgerModel.create([{
            transaction : transaction._id,
            account : fromUserAccount._id,
            type : "DEBIT",
            amount : amount
        }],{session})

        await ledgerModel.create([{
            transaction : transaction._id,
            account : toAccount,
            type : "CREDIT",
            amount : amount
        }],{session})
        transaction.status = "COMPLETED"
        await transaction.save({session})
        await session.commitTransaction()
        session.endSession()
        return res.status(201).json({
            message : "Initial Funds Transaction Completed Successfully",
            transaction
        })
    } catch (error) {
        await session.abortTransaction()
        session.endSession()
        return res.status(500).json({
            message : "Internal Server Error or Transaction is pending,"// as say 
        })
    }
    
}

module.exports = { createTransaction,createInitialFundsTransaction }
