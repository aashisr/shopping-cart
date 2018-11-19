const express = require('express');
const crypto = require('crypto');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const Users = require('../models/users');
const authenticate = require('../authenticate');
const config = require('../config');

//Username and password or api key as options for sendgridTransport method
var sendgridOptions = {
    auth: {
        api_key: config.sendGridApi
    }
};

//Initialize mailer for nodemailer
const mailer = nodemailer.createTransport(sendgridTransport(sendgridOptions));

const userRouter = express.Router();

//Make use of body parser
userRouter.use(bodyParser.json());

/* GET users listing. */
userRouter.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

userRouter.route('/register')
    .get((req, res, next) => {
        //Get the flash message if any
        const errorMessage = req.flash('error');

        res.render('user/register.ejs', {
            pageTitle: 'Register',
            active: 'register',
            errorMessage: errorMessage
        });
    })
    .post((req, res, next) => {
        //Find if a user already exists
        Users.findOne({email: req.body.email})
            .then((user) => {
                //If user with given email exists already
                if (user) {
                    req.flash('error', 'User with given email already exists.');
                    return res.redirect('/users/register');
                }

                //If user does not exist
                //Hash the password with bcrypt which returns a promise and create a new user
                return bcrypt.hash(req.body.password, 12)
                    .then((hashedPassword) => {
                        const newUser = new Users({
                            email: req.body.email,
                            password: hashedPassword,
                            firstName: req.body.firstName,
                            lastName: req.body.lastName
                        });

                        return newUser.save();

                    })
                    .then((result) => {
                        //Set a success message
                        req.flash('success', 'You are successfully registered. Please, log in here.')
                        res.redirect('/users/login');

                        //Create an email to send
                        const email = {
                            to: req.body.email,
                            from: 'aashis_rimal@yahoo.com',
                            subject: 'Welcome to Kinmel.com.',
                            html: '<h1>You are successfully registerd to Kinmel.com.</h1>'
                        };

                        //Send mail after redirection using the mailer defined above
                         return mailer.sendMail(email)
                            .then((result) => {
                                console.log(result);
                            })
                            .catch((err) => {
                                console.log(err);
                                next(err);
                            });
                    })

            })
            .catch((err) => {
                console.log(err);
                res.redirect('/users/register');
            });

        //register is a passportLocalMongoose method, checks if email is unique
        /*Users.register(new Users({email: req.body.email}), req.body.password, (err, user) => {
            if (err){
                console.log(err);
                return res.redirect('/users/register');
            } else {
                console.log('Register');
            }
        })*/
    });

userRouter.route('/login')
    .get((req, res, next) => {
        //Get the success and error messages
        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');

        res.render('user/login.ejs', {
            pageTitle: 'Login',
            active: 'login',
            successMessage: successMessage,
            errorMessage: errorMessage
        });
    })
    .post((req, res, next) => {
        //Find the user from our database by the email provided by user
        Users.findOne({email: req.body.email})
            .then((user) => {
                //If user does not exist
                if (!user) {
                    req.flash('error', 'Invalid email or password. Please, try again.');
                    return res.redirect('/users/login');
                }

                //User exists
                //Validate user's password, compare the given password with user's password in database
                //Returns true if password is matched else false
                bcrypt.compare(req.body.password, user.password)
                    .then((match) => {
                        //If match is true, password is a valid password
                        if (match) {
                            //Create a session for the logged in user
                            req.session.authenticated = true;
                            req.session.user = user;
                            return req.session.save((err) => {
                                console.log(err);
                                res.redirect('/');
                            });
                        }

                        //If password is not valid,
                        req.flash('error', 'Invalid email or password. Please, try again.');
                        res.redirect('/users/login');
                    })
                    .catch((err) => {
                        req.flash('error', err);
                        res.redirect('/users/login');
                    });

            })
            .catch((err) => {
                req.flash('error', err);
                res.redirect('/users/login');
            });
    });

userRouter.route('/logout')
    .get(authenticate.isLoggedIn, (req, res, next) => {
        req.session.destroy((err) => {
            console.log(err);
            res.redirect('/');
        });
    });

userRouter.route('/reset-password')
    .get((req, res, next) => {
        //Get the success and error messages
        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');

        res.render('user/resetPassword.ejs', {
            pageTitle: 'Reset password',
            active: 'reset',
            successMessage: successMessage,
            errorMessage: errorMessage
        });
    })
    .post((req, res, next) => {
        const email = req.body.email;

        //Create a unique random crypto value of length 32 bytes to send it with the email
        crypto.randomBytes(32, (err, buffer) => {
            if (err){
                console.log('Crypto buffer error: ', err);
                res.redirect('/users/resetPassword');
            }

            //Generate a token from the buffer and convert hexadecimal characters to ascii characters
            const token = buffer.toString('hex');

            //Find the user by email and store this token and the expiration date in the database
            Users.findOne({email: email})
                .then((user) => {
                    if (!user) {
                        req.flash('error', 'User does not exist with this email.');
                        return res.redirect('/users/reset-password');
                    }

                    //Save the token and expiration date to user
                    user.resetToken = token;
                    user.resetTokenExpires = Date.now() + 1000*60*60; //1 hour from now

                    //Save the user first and send the email
                    return user.save()
                        .then((user) => {
                            res.redirect('/');
                            //Send the email to user
                            //Create an email to send
                            const email = {
                                to: req.body.email,
                                from: 'aashis_rimal@yahoo.com',
                                subject: 'Reset Password',
                                html: "<h1>Hi " + user.firstName + ",</h1>" +
                               "<p>A request was sent to reset the password for the account linked to this email.</p>" +
                                "<p>To proceed, simply click on this" +
                                "<a href='http://localhost:3000/users/reset-password/"+ token +"'> link</a>.</p>"
                            };

                            //Send mail after redirection using the mailer defined above
                            return mailer.sendMail(email)
                                .then((result) => {
                                    console.log(result);
                                })
                                .catch((err) => {
                                    console.log(err);
                                    next(err);
                                });
                        });
                })
                .catch((err) => {
                    console.log(err);
                    next(err);
                })
        });

    });

userRouter.route('/reset-password/:token')
    .get((req, res, next) => {
        const token = req.params.token;

        //Find the user with this token which is still valid, i.e expiration date is greater than the current date
        Users.findOne({resetToken: token, resetTokenExpires: {$gt: Date.now()}})
            .then((user) => {
                if (!user) {
                    req.flash('error', 'The user does not exist or the token has expired.');
                    return res.redirect('/users/reset-password');
                }

                //Get the success and error messages
                const successMessage = req.flash('success');
                const errorMessage = req.flash('error');

                res.render('user/enterNewPassword.ejs', {
                    pageTitle: 'Enter New password',
                    active: 'newPassword',
                    userId: user._id,
                    resetToken: token,
                    successMessage: successMessage,
                    errorMessage: errorMessage
                });
            })
            .catch((err) => {
                console.log(err);
                next(err);
            });

    });

userRouter.route('/new-password')
    .post((req, res, next) => {
        //Get the form inputs
        const userId = req.body.userId;
        const newPassword = req.body.password;
        const resetToken = req.body.resetToken;

        //Find the user with the above id, reset token and a valid expiration date
        Users.findOne({ _id: userId, resetToken: resetToken, resetTokenExpires: {$gt: Date.now()} })
            .then((user) => {
                if (!user){
                    req.flash('error', 'The user does not exist or the token has expired.');
                    return res.redirect('/users/reset-password');
                }

                //Hash the password
                bcrypt.hash(newPassword, 12)
                    .then((hashedPassword) => {
                        //Save the user with this new password and token and expiration date as undefined
                        user.password = hashedPassword;
                        user.resetToken = undefined;
                        user.resetTokenExpires = undefined;

                        return user.save()
                            .then((result) => {
                                res.redirect('/users/login');
                            })
                            .catch((err) => {
                                console.log(err);
                                next(err);
                            });
                    })
                    .catch((err) => {
                        console.log(err);
                        next(err);
                    });

            })
            .catch((err) => {
                console.log(err);
                next(err);
            });

    });

module.exports = userRouter;
