const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/userModels');
const passport = require('passport');
const Loan = require('../models/loanModels')


router.get('/showall', isLoggedIn, (req, res) => {
    Loan.find({}, (err, loans) => {
        if (err) {
            console.log(err);
        } else {
            var filterLoans = loans.filter(loan => {

                return (!loan.recepient.equals(req.user._id));
            })
            res.render('loan/all', { loans: filterLoans });
        }
    });
});

router.get('/new', isLoggedIn, (req, res) => {
    res.render('loan/newloan');
});

router.post("/new", isLoggedIn, (req, res) => {
    Loan.create({
        recepient: req.user._id,
        amtReq: req.body.amount,
        dateRequested: Date.now(),
        dateDue: req.body.date*30,
        dateRemaining: req.body.date*30,
    }, (err, loan) => {
        if (err) {
            console.log(err);
            res.redirect('/loan/new');
        } else {
            User.findById(req.user._id, (err, user) => {
                if (err) {
                    console.log(err);
                } else {
                    user.loanreq.push(loan._id);
                    user.save();
                    res.redirect(`/loan/${loan._id}`);
                }

            })

        }

    })
})

router.get('/:loanid', isLoggedIn, (req, res) => {
    Loan.findById(req.params.loanid, (err, loan) => {
        res.render('loan/loandetails', { loan: loan });
    })
})

router.get('/:loanid/bid', isLoggedIn, (req, res) => {
    Loan.findById(req.params.loanid, (err, loan) => {
        if (err) {
            console.log(err);
        } else {
            res.render('loan/bid', { loan });
        }
    });

});

router.post('/:loanid/bid', (req, res) => {
    Loan.findById(req.params.loanid, (err, loan) => {
        if (err) {
            console.log(err);
        } else {
            if (req.body.amount <= (loan.amtReq - loan.amtSatisfied) && req.body.amount !== 0) {

                User.findById(req.user._id, (err, user) => {
                    if (err) {
                        console.log(err);
                    } else {

                        if (user.wallet >= req.body.amount) {
                            loan.collablender.push({ _id: user._id, amtcontrib: req.body.amount })
                            let newsat = parseInt(loan.amtSatisfied) + parseInt(req.body.amount);
                            loan.amtSatisfied = newsat;
                            if (loan.amtSatisfied == loan.amtReq) {
                                //console.log(loan.status);
                                loan.status = 'accepted';
                                User.findById(loan.recepient, (err, user) => {
                                    if (err) {
                                        console.log(user);
                                    } else {
                                        user.wallet += loan.amtReq;
                                        user.save();
                                    }

                                });
                            }
                            user.wallet = parseInt(user.wallet) - parseInt(req.body.amount);
                            loan.save();
                            user.save();
                            res.render('loan/bidsuccess');
                        }
                        else {
                            res.redirect('/loan/showall');
                        }


                    }
                })



            }
            else {
                res.redirect('/loan/', req.params.loanid);
            }


        }
    })

})

function isLoggedIn(req, res, next) {
    // console.log(req.isAuthenticated());
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/user/login');
}

var dayDuration = 10000;

var interTimer = setInterval(() => {
    Loan.find({ status: 'pending' }, (err, loans) => {
        if (err) {
            console.log(err);
        } else {
            if (loans.length !== 0) {
                loans.forEach(loan => {
                    if (loan.timeForBid <= 0) {
                        loan.status = 'declined';
                    }
                    (async () => {
                        loan.timeForBid -= 1;
                    })();

                    loan.save();
                })
            } 
        }

    });

   
}, dayDuration);

const interestRate = 0.12;

var installTimer = setInterval(() => {
    Loan.find({ status: 'accepted' }, (err, loans) => {
        if (err) {
            console.log(err);
        } else {
            if (loans.length !== 0) {
               // console.log(loans);
                loans.forEach(loan=>{
                    if(loan.dateRemaining%30===0){
                        //payment
                        //console.log(loan._id ,'-',loan.dateRemaining);
                        if(loan.dateRemaining<=0){
                            loan.status = 'paid';
                        }
                        User.findById(loan.recepient._id,(err,user)=>{       
                        user.wallet -= parseFloat(((loan.amtReq)+((loan.amtReq*interestRate*loan.dateDue)/12))/loan.dateDue);
                        if(user.wallet>=0){
                            user.save();
                            loan.collablender.forEach(payee=>{
                                User.findById(payee._id,(err,paye)=>{
                                    paye.wallet += (((loan.amtReq)+((loan.amtReq*interestRate*loan.dateDue)/12))/loan.dateDue)*(payee.amtcontrib/loan.amtReq); 
                                    paye.save();
                                })
    
                            })

                        }else{
                            loan.status = 'default';
                        }

                        })

                 


                    }
                    if(loan.status !== 'default'){
                        loan.dateRemaining=loan.dateRemaining-1;
                    }
                    
                    loan.save();
                })

            } 
        }

    });

   
}, dayDuration);


var defaultTimer = setInterval(()=>{
    Loan.find({status: 'default'},(err,loans)=>{
        loans.forEach(loan=>{
            console.log('hello');
            User.findById(loan.recepient._id,(err,user)=>{
                const sgMail = require('@sendgrid/mail');
                sgMail.setApiKey(process.env.SENDGRID_API_KEY);
                const msg = {
                            to: user.email,
                            from: 'alaapbanerjee08@gmail.com',
                            subject: 'Sending with Twilio SendGrid is Fun',
                            text: 'and easy to do anywhere, even with Node.js'
};
sgMail.send(msg);
            })
        })
    })
},dayDuration)



module.exports = router;
