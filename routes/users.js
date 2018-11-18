const express = require('express');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Users = require('../models/users');
const authenticate = require('../authenticate');

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

                        newUser.save();

                        //Set a success message
                        req.flash('success', 'You are successfully registered. Please, log in here.')

                        res.redirect('/users/login');
                    });
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

module.exports = userRouter;
