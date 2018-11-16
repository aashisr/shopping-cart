const express = require('express');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const Users = require('../models/users');

const userRouter = express.Router();

//Make use of body parser
userRouter.use(bodyParser.json());

/* GET users listing. */
userRouter.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

userRouter.route('/register')
    .get((req, res, next) => { /**/
      res.render('user/register.ejs', {
          pageTitle: 'Register',
          active: 'register'
      });
    })
    .post((req, res, next) => {
        console.log('Register post');
        console.log(req.body);

        const user = new Users({
            email: req.body.email,
            password: req.body.password,
            firstName: req.body.firstName,
            lastName: req.body.lastName
        });

        user.save();

        res.redirect('/');
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

module.exports = userRouter;
