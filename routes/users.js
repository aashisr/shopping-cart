const express = require('express');
const crypto = require('crypto');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
//Import subpackages of express-validator and store it in a object using destructuring
const { check, body, validationResult } = require('express-validator/check');
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
            errorMessage: errorMessage,
            //Display the previous input in the form as empty string
            previousInput: {
                email: "",
                password: "",
                confirmPassword: "",
                firstName: "",
                lastName: ""
            }
        });
    })
    //Add validation for user input,
    // check finds the name either from cookies, params, header, query or body
    //body finds the name from the req.body only
    //So, no need to specify req.body.email
    .post(
        //Get email from cookies, params, header, query or body
        //second parameter is the error message for all checks in check firstName
        body('email').isEmail().withMessage('Please, enter a valid email.')
            //Check if user exists already in here with custom validator
            .custom((value, { req }) => {
                //Custom validator needs to return true or false
                return Users.findOne({ email: value })
                    .then((user) => {
                        if (user) {
                            //reject throws an error inside promise
                            return Promise.reject('User with given email already exists.');
                        }
                    });
            })
            .normalizeEmail(),
        body('firstName', 'Please, enter a valid first name.').isAlpha().trim(),
        body('lastName').isAlpha().withMessage('Please, enter a valid last name.').trim(),
        //Get password from req.body
        body('password').isLength({min: 6}).withMessage('Password must be at lease 6 characters long.').trim(),
        //Add a custom validator to check if the passwords match
        body('confirmPassword').custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match.');
            }

            //If matches
            return true;
        }).trim()
    , (req, res, next) => {
            //Get user submitted values
            const email = req.body.email;
            const password = req.body.password;
            const confirmPassword = req.body.confirmPassword;
            const firstName = req.body.firstName;
            const lastName = req.body.lastName;

        //Store the validation results in this request in the errors constant
        const errors = validationResult(req);

        //Check if there are errors
        if (!errors.isEmpty()){
            //If the errors is not empty, render the same page again and display the errors
            //422 -> Unprocessable entity
            return res.status(422).render('user/register.ejs', {
                pageTitle: 'Register',
                active: 'register',
                errorMessage: errors.array()[0].msg, //Array of errors, take the first error
                //Display the previous input in the form
                previousInput: {
                    email: email,
                    password: password,
                    confirmPassword: confirmPassword,
                    firstName: firstName,
                    lastName: lastName
                }
            });
        }

        //User existence is checked already with the express validator

        //Hash the password with bcrypt which returns a promise and create a new user
        bcrypt.hash(password, 12)
            .then((hashedPassword) => {
                const newUser = new Users({
                    email: email,
                    password: hashedPassword,
                    firstName: firstName,
                    lastName: lastName
                });

                return newUser.save();

            })
            .then((result) => {
                //Set a success message
                req.flash('success', 'You are successfully registered. Please, log in here.')
                res.redirect('/users/login');

                //Create an email to send
                const email = {
                    to: email,
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
                        console.log('Sendgrid ', err);
                        next(err);
                    });
            })
            .catch((err) => {
                console.log(err);
                next(err);
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
            errorMessage: errorMessage,
            //Previous input for errors
            previousInput: {
                email: '',
                password: ''
            }
        });
    })
    .post(
        body('email').isEmail().withMessage('Please, enter a valid email.'),
        (req, res, next) => {
            //Get the user submitted values
            const email = req.body.email;
            const password = req.body.password;

            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                //If the errors is not empty, render the same page again and display the errors
                return res.status(422).render('user/login.ejs', {
                    pageTitle: 'Login',
                    active: 'login',
                    successMessage: "",
                    errorMessage: errors.array()[0].msg, //Array of errors, take the first error
                    //Display the previous input in the form
                    previousInput: {
                        email: email,
                        password: password
                    }
                });
            }

        //Find the user from our database by the email provided by user
        Users.findOne({email: email})
            .then((user) => {
                //If user does not exist
                if (!user) {
                    return res.status(422).render('user/login.ejs', {
                        pageTitle: 'Login',
                        active: 'login',
                        successMessage: "",
                        errorMessage: 'Invalid email or password. Please, try again.',
                        //Display the previous input in the form
                        previousInput: {
                            email: email,
                            password: password
                        }
                    });
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

                            //If user is admin, store in session
                            if (user.admin === true) {
                                req.session.isAdmin = true;
                            } else {
                                req.session.isAdmin = false;
                            }

                            return req.session.save((err) => {
                                console.log(err);
                                res.redirect('/');
                            });
                        }

                        //If password is not valid,
                        return res.status(422).render('user/login.ejs', {
                            pageTitle: 'Login',
                            active: 'login',
                            successMessage: "",
                            errorMessage: 'Invalid email or password. Please, try again.',
                            //Display the previous input in the form
                            previousInput: {
                                email: email,
                                password: password
                            }
                        });
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
