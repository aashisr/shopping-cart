const express = require('express');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const Users = require('../models/users');

const userRouter = express.Router();

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
        //register is a passportLocalMongoose method, checks if email is unique
        Users.register(new Users({email: req.body.email}), req.body.password, (err, user) => {
            if (err){
                return res.redirect('users/register');
            } else {
                console.log('Register');
            }
        })
    });

module.exports = userRouter;
