var express = require('express');
var router = express.Router();

//Import products model and store in Products variable
const Products = require('../models/products');

/* GET home page. */
router.get('/', function(req, res, next) {
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

module.exports = router;
