const mongoose = require('mongoose')
const ledgerModel = require("../models/ledger.model")

const accountSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref : 'user',
        required :[true ,"Account must be associated a user!!"], 
        index:true , // indexing is done for faster searching
        unique:true,
        required:true
    },
    status:{
        type: String,
        enum:{
            values:['ACTIVE','FROZEN','CLOSED'],
            message:"Status can be either ACTIVE,FROZEN or CLOSED",
        },
        default:'ACTIVE'
    },
        currency:{
            type : String,
            required:[true, "Currency is required for creating an account"],
            default:"INR"
        }
    
},{
    timestamps : true
})//compund index
accountSchema.index({user:1,status:1})

accountSchema.methods.getBalance = async function(){ // cannot be a arrow function
    // the whole balance details are present in the ledger
    // balance = sum(all credited money) - sum(all debited money)
    const balanceDetails = await ledgerModel.aggregate([ // Aggregate allows a user to run custom queries on the data
        {$match:{account:this._id}}, 
        {
            $group:{
                _id:null, // beacuse we just one final result of the entire account transactions, not for each individual
                totalCreditAmount:{
                    $sum:{
                        $cond:[
                            {$eq:["$type","CREDIT"]},
                            "$amount",0 // we add values for credit and 0 for unmatched
                        ]
                    }
                },
                totalDebitAmount:{
                    $sum:{
                        $cond:[
                            {$eq:["$type","DEBIT"]},"$amount",0
                        ]
                    }
                }
            }
        },
        // now add the two values to get the final result
        {$project:
            {
            _id:0,
            balance : {$subtract : ["$totalCreditAmount","$totalDebitAmount"]}        
            }
        }
    ])
    if(balanceDetails.length==0 || balanceDetails[0].balance<0){
        return 0
    }
    return balanceDetails[0].balance
}


const accountModel = mongoose.model('account',accountSchema)

module.exports = accountModel