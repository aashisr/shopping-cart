const express = require('express');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Users = require('../models/users');

const userRouter = express.Router();

//Make use of body parser
userRouter.use(bodyParser.json());

/* GET users listing. */
userRouter.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

userRouter.route('/register')
    .get((req, res, next) => {
      res.render('user/register.ejs', {
          pageTitle: 'Register',
          active: 'register'
      });
    })
    .post((req, res, next) => {
        console.log('Register post');
        console.log(req.body);

        //Find if a user already exists
        Users.findOne({email: req.body.email})
            .then((user) => {
                if (user) {
                    console.log('User already exists');
                    res.redirect('/users/register');
                }

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

                        res.redirect('/users/login');
                    });
            })
            .catch((err) => {
                console.log(err);
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
        res.render('user/login.ejs', {
            pageTitle: 'Login',
            active: 'login'
        });
    });

module.exports = userRouter;
