const express = require('express');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const Users = require('../models/users');
const Products = require('../models/products');
const Orders = require('../models/orders');
const authenticate = require('../authenticate');

const orderRouter = express.Router();

//Make use of body parser
orderRouter.use(bodyParser.json());

orderRouter.route('/')
    .get(authenticate.isLoggedIn, (req, res, next) => {
        //Get the orders of only the logged in user
        Orders.find({user: req.user._id})
            .populate('products.product')
            .then((orders) => {
                console.log('Orders: ', orders);
                //Render the orders page
                res.render('shop/orders.ejs', {
                    products: orders,
                    pageTitle: 'Your Orders',
                    active: 'orders'
                })
            });
    })
    .post(authenticate.isLoggedIn, (req, res, next) => {
        //Get the user and the items in the cart
        req.user
            .execPopulate()
            .then((user) => {
                //Create a new order
                Orders.create({products: user.cart.items, user: user})
                    .then((order) => {
                        //Empty the cart of this user
                        req.user.emptyCart();

                        res.redirect('/');

                    }, (err) => next(err))
                    .catch((err) => {
                        next(err);
                    });

            }, (err) => next(err))
            .catch((err) => {
                next(err);
            })
    });

//Export this route as a module
module.exports = orderRouter;