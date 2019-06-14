const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema =new mongoose.Schema({
    name : {type: String, required: true},
    username : {type: String, required: true},
    password : {type: String},
    email : {type:String,unique: true},
    loansTaken: [{type:mongoose.Schema.Types.ObjectId,ref:'Loan'}],
    contributedLoans:[{type: mongoose.Schema.Types.ObjectId, ref: 'Loan'}],
    wallet: {type: Number, default: 100},
    isAdmin: {type: String, default: 'no'},
    kyc:{type:mongoose.Schema.Types.ObjectId, ref: 'KYC'},
    profilePic:{type: String}
})
userSchema.plugin(passportLocalMongoose);


module.exports = mongoose.model('User', userSchema);