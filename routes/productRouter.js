//This is an mini express router, so we require all that was required in app.js
const express = require('express');

const bodyParser = require('body-parser');

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
                    title: 'Shopping Cart'
                });
            }, (err) => next(err)) //sends the error to the error handler
            .catch((err) => next(err));
    });

//Export this route as a module
module.exports = productRouter;