//This is an mini express router, so we require all that was required in app.js
const express = require('express');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');

//Import products model and store in Products variable
const Products = require('../models/products');
const authenticate = require('../authenticate');
const { body, validationResult } = require('express-validator/check');

//Declare productRouter as express router
const productRouter = express.Router();

//Make use of body parser
productRouter.use(bodyParser.json());

productRouter.route('/')
    .get((req, res, next) => {
        //Find all the products from the Products model i.e products collection in database
        Products.find()
            .then((products) => {
                if (!products) {
                    const err = {
                        message: 'There are no products yet..'
                    };

                    next(err);
                }

                res.render('index.ejs', {
                    products: products,
                    pageTitle: 'Shopping Cart',
                    active: 'shop'
                });
            }, (err) => next(err)) //sends the error to the error handler
            .catch((err) => next(err));
    });

productRouter.route('/add-product')
    .get(authenticate.isLoggedIn, authenticate.isAdmin, (req, res, next) => {
        res.render('product/addProduct.ejs', {
            pageTitle: 'Add Product',
            active: 'addProduct',
            errorMessage: [],
            //Display the previous input in the form
            previousInput: {
                title: "",
                price: "",
                imagePath: "",
                description:""
            }
        });
    })
    .post(authenticate.isLoggedIn, authenticate.isAdmin, [
        body('title').isString().withMessage('Title should be a string.').trim().escape(),
        body('price').isNumeric().withMessage('Price should only contain numbers.').trim().escape(),
        body('description', 'Description should not be more than 200 characters.')
            .isString().isLength({max: 200}).trim().escape(),
        ],
        (req, res, next) => {
            //Get the validation errors
            const errors = validationResult(req);

            if (!errors.isEmpty()){
                return res.status(422).render('product/addProduct.ejs', {
                    pageTitle: 'Add Product',
                    active: 'addProduct',
                    errorMessage: errors.array()[0].msg, //Array of errors, take the first error
                    //Display the previous input in the form
                    previousInput: {
                        title: req.body.title,
                        price: req.body.price,
                        imagePath: req.body.imagePath,
                        description: req.body.description,
                    }
                });
            }

        //Post the parsed request to the Products model i.e products collection
        //req.body is already parsed by bodyParser
        //create is a mongoose method
        Products.create(req.body)
            .then((product) => {
                res.redirect('/products/add-product');
            }, (err) => next(err))
            .catch((err) => next(err));
    });

productRouter.route('/edit/:productId')
    .get(authenticate.isLoggedIn, authenticate.isAdmin, (req, res, next) => {
        Products.findById(req.params.productId)
            .then((product) => {
                res.render('product/editProduct.ejs', {
                    product: product,
                    pageTitle: 'Edit Product',
                    active: 'addProduct',
                    errorMessage: ""
                });
            }, (err) => next(err))
            .catch((err) => next(err));
    })
    .post(authenticate.isLoggedIn, authenticate.isAdmin, [
        body('title').isString().withMessage('Title should be a string.').trim().escape(),
        body('price').isNumeric().withMessage('Price should only contain numbers.').trim().escape(),
        body('description', 'Description should not be more than 200 characters.')
            .isString().isLength({max: 200}).trim().escape(),
        ], (req, res, next) => {
        //Get the validation errors
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(422).render('product/editProduct.ejs', {
                pageTitle: 'Edit Product',
                active: 'addProduct',
                errorMessage: errors.array()[0].msg, //Array of errors, take the first error
                //Display the previous input in the form
                product: {
                    _id: req.params.productId,
                    title: req.body.title,
                    price: req.body.price * 100, //Since it is a currency
                    imagePath: req.body.imagePath,
                    description: req.body.description,
                }
            });
        }

        //Find the product by id and update
        Products.findByIdAndUpdate(req.params.productId,
            { $set: req.body },
            { new: true } //new: true is to return the updated dish
            )
            .then((product) => {
                res.redirect('/');
            }, (err) => next(err))
            .catch((err) => next(err));
    });

productRouter.route('/details/:productId')
    .get((req, res, next) => {
        Products.findById(req.params.productId)
            .then((product) => {
                if (!product) {
                    const err = {
                        message: 'Product does not exist.'
                    };

                    next(err);
                }

                res.render('product/productDetails.ejs', {
                    product: product,
                    pageTitle: product.title,
                    active: 'shop'
                });
            })
            .catch((err) => {
                next(err);
            });

    });

productRouter.route('/delete/:productId')
    .get(authenticate.isLoggedIn, authenticate.isAdmin, (req, res, next) => {
        Products.findByIdAndRemove(req.params.productId)
            .then((response) => {
                console.log(response);
                res.redirect('/');
            }, (err) => next(err))
            .catch((err) => next(err));
    });

//Export this route as a module
module.exports = productRouter;