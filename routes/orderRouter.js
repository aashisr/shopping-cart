const fs = require('fs');
const path = require('path');

const express = require('express');

const Users = require('../models/users');
const Products = require('../models/products');
const Orders = require('../models/orders');
const authenticate = require('../authenticate');

const orderRouter = express.Router();

orderRouter.route('/')
    .get(authenticate.isLoggedIn, (req, res, next) => {
        //Get the orders of only the logged in user
        Orders.find({user: req.user._id})
            .populate('products.product')
            .then((orders) => {
                console.log('Orders: ', orders);
                //Render the orders page
                res.render('shop/orders.ejs', {
                    orders: orders,
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

//Route to get the invoice for the given order id
orderRouter.route('/:orderId')
    .get(authenticate.isLoggedIn, (req, res, next) => {
        //Get the order id and the invoice name which is stored in the database in the given form
        const orderId = req.params.orderId;

        //Check if the order belongs to the user
        Orders.findById(orderId)
            .then((order) => {
                if (!order){
                    const err = new Error('Order does not exist.');
                    return next(err);
                }

                //Check the id of the logged in user with the one stored in the order
                if (order.user.toString() !== req.user._id.toString()){
                    res.status = 403;
                    const err = new Error('You are not allowed to view this order.');
                    return next(err);
                }

                const invoiceName = 'invoice-' + orderId + '.pdf';
                //Use path to construct the path so that it works on all operating systems
                const invoicePath = path.join('public', 'invoices', invoiceName);

                //Read the file in different chunks (not whole file)
                const file = fs.createReadStream(invoicePath);

                res.setHeader('Content-Type', 'application/pdf'); //Opens the file in the browser
                res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');

                //Forward the read file step by step to res using pipe
                file.pipe(res);

            })
            .catch((err) => {
                console.log('Error in orders/:orderId ', err);
                next(err);
            });
    });

//Export this route as a module
module.exports = orderRouter;