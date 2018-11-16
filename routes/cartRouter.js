const express = require('express');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const Users = require('../models/users');
const Products = require('../models/products');
const authenticate = require('../authenticate');

const cartRouter = express.Router();

//Make use of body parser

cartRouter.use(bodyParser.json());

cartRouter.route('/')
    .get(authenticate.isLoggedIn, (req, res, next) => {
        //Find all the products from the Products model i.e products collection in database
        Users.findById(req.user._id)
            .populate('cart.items.product')
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
        //Find the cart item by id and remove
        res.redirect('/cart');
    });

//Export this route as a module
module.exports = cartRouter;