//This is an mini express router, so we require all that was required in app.js
const express = require('express');

const bodyParser = require('body-parser');
const mongoose = require('mongoose');
//Middleware for handling multipart/form data (file upload)
const multer = require('multer');

//Import products model and store in Products variable
const Products = require('../models/products');
const authenticate = require('../authenticate');
const { body, validationResult } = require('express-validator/check');

//Tell multer where to store the submitted files
const storage = multer.diskStorage({
    //Specify destination for the file to be stored
    destination: (req, file, cb) => {
        //First parameter is the error and second is the destination
        cb(null, 'public/images');
    },
    //Specify the name of the submitted file
    filename: (req, file, cb) => {
        //Set the name to be the original name of the file
        //Add the date timestamp before the file name so that the name does  not repeat
        cb(null, Date.now() +'-'+ file.originalname);
    }
});

//Check the file type
const imageFilter = (req, file, cb) => {
    //Check the file type using regular expression (regex)
    if (file.originalname.match(/\.(jpg|jpeg|png|gif)$/)){
        //Accept the file, error is null
        cb(null, true);
    } else {
        cb(null, false)
    }
};

//Configure multer, set the storage to storage defined above and file filter as defined above
const upload = multer({storage: storage, fileFilter: imageFilter});

//Declare productRouter as express router
const productRouter = express.Router();

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
        console.log('Get add product csrftoken ',req.csrfToken());
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
    .post(authenticate.isLoggedIn, authenticate.isAdmin, /*[
        body('title').isString().withMessage('Title should be a string.').trim().escape(),
        body('price').isNumeric().withMessage('Price should only contain numbers.').trim().escape(),
        body('description', 'Description should not be more than 200 characters.')
            .isString().isLength({max: 200}).trim().escape(),
        ],*/
        upload.single('image'), //Specify single file upload and image is the name of input field
        (req, res, next) => {
            //Get the data submitted
            const userId = req.body.user;
            const title = req.body.title;
            const image = req.file;
            const price = req.body.price;
            const description = req.body.description;

            //Get the validation errors
            /*const errors = validationResult(req);

            if (!errors.isEmpty()){
                console.log('Add product validation error ', errors.array());
                return res.status(422).render('product/addProduct.ejs', {
                    pageTitle: 'Add Product',
                    active: 'addProduct',
                    errorMessage: errors.array()[0].msg, //Array of errors, take the first error
                    //Display the previous input in the form
                    previousInput: {
                        title: title,
                        price: price,
                        description: description
                    }
                });
            }*/

            //If no image, return the same page with error
            if (!image) {
                return res.status(422).render('product/addProduct.ejs', {
                    pageTitle: 'Add Product',
                    active: 'addProduct',
                    errorMessage: 'Image is required.',
                    //Display the previous input in the form
                    previousInput: {
                        title: title,
                        price: price,
                        description: description
                    }
                });
            }

        //Post the parsed request to the Products model i.e products collection
        //req.body is already parsed by bodyParser
        //create is a mongoose method
        Products.create({
            user: userId,
            title: title,
            imagePath: '/'+image.path, //Add backslash so that we get the correct path when displaying the image
            price: price,
            description: description,
        })
            .then((product) => {
                console.log('Uploaded product is ',product);
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
    .post(authenticate.isLoggedIn, authenticate.isAdmin, /*[
        body('title').isString().withMessage('Title should be a string.').trim().escape(),
        body('price').isNumeric().withMessage('Price should only contain numbers.').trim().escape(),
        body('description', 'Description should not be more than 200 characters.')
            .isString().isLength({max: 200}).trim().escape(),
        ],*/
        upload.single('image'), //Specify single file upload and image is the name of input field
        (req, res, next) => {
            //Get the data submitted
            const productId = req.params.productId;
            const title = req.body.title;
            const image = req.file;
            const price = req.body.price;
            const description = req.body.description;

        //Get the validation errors
        /*const errors = validationResult(req);

        if (!errors.isEmpty()) {
            console.log('Edit product validation errors ',errors.array());
            return res.status(422).render('product/editProduct.ejs', {
                pageTitle: 'Edit Product',
                active: 'addProduct',
                errorMessage: errors.array()[0].msg, //Array of errors, take the first error
                //Display the previous input in the form
                product: {
                    _id: req.params.productId,
                    title: req.body.title,
                    price: req.body.price * 100, //Since it is a currency
                    description: req.body.description,
                }
            });
        }*/

        //Find the product by id and update
        Products.findById(productId)
            .then((product) => {
                product.title = title;
                product.price = price;
                product.description = description;

                //Update image if given, else leave the previous image as it is
                if (image){
                    product.imagePath = '/' + image.path;
                }

                //Save the product
                product.save();

                return res.redirect('/');

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