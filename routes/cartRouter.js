const express = require('express');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const Users = require('../models/users');
const Products = require('../models/products');
const authenticate = require('../authenticate');

const cartRouter = express.Router();

cartRouter.route('/')
    .get(authenticate.isLoggedIn, (req, res, next) => {
        //req.user already contains the user object which also includes the cart
        //So no need to find the user by id again
        //Since, req.user.populate does not return a promise, execPopulate is chained to return promise
        req.user
            .populate('cart.items.product')
            .execPopulate()
            .then((user) => {
                res.render('shop/cart.ejs', {
                    products: user.cart.items,
                    pageTitle: 'Your Cart',
                    active: 'cart'
                });
            }, (err) => next(err)) //sends the error to the error handler
            .catch((err) => next(err));
    });

cartRouter.route('/add-product')
    .post(authenticate.isLoggedIn, (req, res, next) => {
        //Get the productId to be added to the cart
        const productId = req.body.productId;
        //Find the product by id
        Products.findById(productId)
            .then((product) => {
                return req.user.addToCart(product);
            }, (err) => next(err)) //sends the error to the error handler
            .then((result) => {
                console.log(result);
                res.redirect('/');
            }, (err) => next(err))
            .catch((err) => next(err));
    });

cartRouter.route('/delete-item')
    .post(authenticate.isLoggedIn, (req, res, next) => {
        // Get the user object from the request
        // deleteItemFromCart is a method in user model
        req.user
            .deleteItemFromCart(req.body.productId)
            .then((result) => {
                console.log(result);
                res.redirect('/cart');
            }, (err) => next(err))
            .catch((err) => next(err));
    });

//Export this route as a module
module.exports = cartRouter;