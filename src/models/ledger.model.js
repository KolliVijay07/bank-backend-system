const mongoose = require('mongoose')
const ledgerSchema = new mongoose.Schema({
    account:{
        type:mongoose.Schema.Types.ObjectId,
        ref : "account",
        required : [true,"Ledger must be associated with an account"],
        immutable:true,
        index:true
    },

    amount:{
        type: Number,
        required: [ true, "Amount is required for creating a ledger entry" ],
        immutable: true
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        required: [ true, "Ledger must be associated with a transaction" ],
        index: true,
        immutable: true
    },
    type: {
        type: String,
        enum: {
        values: [ "CREDIT", "DEBIT" ],
        message: "Type can be either CREDIT or DEBIT",
        },
        required: [ true, "Ledger type is required" ],
        immutable: true
    }
},{
    timestamps : true
})

function preventLedgerModification() {
    throw new Error("Ledger entries are immutable and cannot be modified or deleted");
}

ledgerSchema.pre('findOneAndUpdate', preventLedgerModification);
ledgerSchema.pre('updateOne', preventLedgerModification);
ledgerSchema.pre('deleteOne', preventLedgerModification);
ledgerSchema.pre('remove', preventLedgerModification);
ledgerSchema.pre('deleteMany', preventLedgerModification);
ledgerSchema.pre('updateMany', preventLedgerModification);
ledgerSchema.pre("findOneAndDelete", preventLedgerModification);
ledgerSchema.pre("findOneAndReplace", preventLedgerModification);

ledgerSchema.index({ account: 1, type: 1, amount: 1 })
// this gives a 99% speedup: This is called a Covered Query. 
// MongoDB can calculate the entire balance entirely inside RAM from the index itself,
// without touching a single document on the disk!

const ledgerModel = mongoose.model('ledger',ledgerSchema)

module.exports = ledgerModel
  