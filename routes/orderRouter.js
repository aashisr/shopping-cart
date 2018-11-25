const express = require('express');
const PdfDocument = require('pdfkit');

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
orderRouter.route('/invoice/:orderId')
    .get(authenticate.isLoggedIn, (req, res, next) => {
        //Get the order id and the invoice name which is stored in the database in the given form
        const orderId = req.params.orderId;

        //Check if the order belongs to the user
        Orders.findById(orderId)
            .populate('products.product')
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

                //Initialize a new pdf document
                const pdf = new PdfDocument();

                res.setHeader('Content-Type', 'application/pdf'); //Opens the file in the browser
                res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');

                //Pipe the pdfDocument to a writeable file stream and send it as a response
                pdf.pipe(res);

                //Add a line of text to the pdf
                pdf.fillColor('purple').fontSize(30).text('KinMel.com', 200, 20, {underline: true});
                pdf.fillColor('black').fontSize(24).text('Invoice', 200, 60);

                //Title
                pdf.fontSize(20)
                    .text('Product', 80, 100)
                    .text('Quantity', 250, 100)
                    .text('Rate', 350, 100)
                    .text('Amount', 420, 100);

                //Iterate through each of the products in order and write to file
                //Increase x-length in each loop
                let x = 130;
                let totalSum = 0;
                order.products.forEach((product, index) => {
                    console.log(product);
                    const sum = product.product.price / 100 * product.quantity;
                    pdf.fontSize(16)
                        .text(index + 1, 20, x)
                        .text(product.product.title, 80, x)
                        .text(product.quantity, 250, x)
                        .text('€' + product.product.price / 100, 350, x)
                        .text('€' + sum, 420, x);

                    x += 20;
                    totalSum += sum;
                });

                //Total sum
                pdf.fontSize(20).text('Total Sum: €' + totalSum, 350, x + 30)

                //Stop writing and send the response
                pdf.end();


            })
            .catch((err) => {
                console.log('Error in orders/:orderId ', err);
                next(err);
            });
    });

//Export this route as a module
module.exports = orderRouter;