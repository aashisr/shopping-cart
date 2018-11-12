//This is an mini express router, so we require all that was required in app.js
const express = require('express');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');

//Import products model and store in Products variable
const Products = require('../models/products');

//Declare productRouter as express router
const productRouter = express.Router();

//Make use of body parser
productRouter.use(bodyParser.json());

productRouter.route('/')
    .get((req, res, next) => {
        //Find all the products from the Products model i.e products collection in database
        Products.find()
            .then((products) => {
                res.render('index.ejs', {
                    products: products,
                    pageTitle: 'Shopping Cart',
                    active: 'shop'
                });
            }, (err) => next(err)) //sends the error to the error handler
            .catch((err) => next(err));
    });

productRouter.route('/add-product')
    .get((req, res, next) => {
        res.render('product/addProduct.ejs', {
            pageTitle: 'Add Product',
            active: 'addProduct'
        });
    })
    .post((req, res, next) => {
        //Post the parsed request to the Products model i.e products collection
        //req.body is already parsed by bodyParser
        //create is a mongoose method
        Products.create(req.body)
            .then((product) => {
                res.render('product/addProduct.ejs', {
                    pageTitle: 'Add Product',
                    active: 'addProduct'
                });
            }, (err) => next(err))
            .catch((err) => next(err));
    });

productRouter.route('/product-details/:productId')
    .get((req, res, next) => {
        Products.findById(req.params.productId)
            .then((product) => {
                res.render('product/productDetails.ejs', {
                    product: product,
                    pageTitle: product.title,
                    active: 'shop'
                });
            }, (err) => next(err))
            .catch((err) => next(err));

    });

//Export this route as a module
module.exports = productRouter;