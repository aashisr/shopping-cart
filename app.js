const path = require('path');

const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('morgan');
const session = require('express-session');
const csrf = require('csurf');
//for storing the sessions in mongodb
const MongoDBStore = require('connect-mongodb-session')(session);
//Mongoose helps to impose a structure on the documents that is going to be stored in the database collection
const mongoose = require('mongoose');
const flash = require('connect-flash');
const stripe = require("stripe")("sk_test_bpnwKXtAnMYhNU3vNyYuD9ml");

const config = require('./config');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const productRouter = require('./routes/productRouter');
const cartRouter = require('./routes/cartRouter');
const orderRouter = require('./routes/orderRouter');
const Orders = require('./models/orders');
const Users = require('./models/users');
const authenticate = require('./authenticate');

//url to connect to mongodb, imported from config.js
const url = config.mongoUrl;
const urlAtlas = config.mongoUrlAtlas;

//Establish a connection with the database and store in connect variable
//Since current URL string parser is deprecated, new URL parser is being used
//For local database
//const connect = mongoose.connect(url, {useNewUrlParser: true});

//For cloud database in mongodb atlas
const connect = mongoose.connect(urlAtlas, {useNewUrlParser: true});

//Now, connect the database and do database operations
connect.then((db) => {
    console.log('Connected to the server');

}, (err) => {
    console.log('Db connection ',err)
}); //Console log the error

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use('/public',express.static(path.join(__dirname, 'public')));

//Initialize csrf protection
//Stores the secret token in session by default
const csrfProtection = csrf();

//Initialize a store for sessions
const store = new MongoDBStore({
    uri: config.mongoUrl,
    collection: 'sessions' //Name of the collection in db
});

//Set up session, cookie for this session is set by default
app.use(session({
    secret: config.secretKey, //secret to sign the hash
    resave: false, //do not save session on every request but only if something has changed
    saveUninitialized: false, //do not save session if not needed
    store: store //Store sessions in the store variable defined above
}));

//Flash should be initialized after session
app.use(flash());

app.use((req, res, next) => {
    res.locals.isLoggedIn = req.session.authenticated;
    res.locals.isAdmin = req.session.isAdmin;
    next();
});

//Create the mongoose user model as a object with the user id stored in sessions
//which can use the methods defined in user model
app.use((req, res, next) => {
    //If session does not exist, user is not needed
    if (!req.session.user) {
        return next();
    }
    else {
        //Find the user object by the user id from session
        Users.findById(req.session.user._id)
            .then((user) => {
                if (!user) {
                    return next();
                }
                //Store the returned user in req.user which has all methods defined in user model
                req.user = user;
                next();
            })
            .catch((err) => {
                console.log('App.js find user ',err);
                next(err);
            });
    }
});

//This is a form submitted through stripe which does not provide the csrf token
//So we need to initialize csrf after this route
app.post('/orders/checkout', authenticate.isLoggedIn, (req, res, next) => {
    // Token is created using Checkout or Elements!
    // Get the payment token ID submitted by the form:
    const token = req.body.stripeToken; // Using Express

    //Get the order data so that the client side data could not be manipulated by users
    req.user
        .populate('cart.items.product')
        .execPopulate()
        .then((user) => {
            const products = user.cart.items;
            //Get the total sum for passing it to stripe
            //Can not rely on data passed to front-end since client side data could be manipulated by users
            let totalSum = 0;
            products.forEach((product) => {
                totalSum += product.quantity * product.product.price;
            });

            //Create a new order
            Orders.create({products: user.cart.items, user: user})
                .then((order) => {
                    //Charge the user here with stripe
                    const charge = stripe.charges.create({
                        amount: totalSum,
                        currency: 'eur',
                        description: 'Payment for Kinmel.com',
                        source: token,
                        //Store order id as meta-data to distinguish which order is the payment coming for
                        metadata: {order: order._id.toString()}
                    });

                    //Empty the cart of this user
                    req.user.emptyCart();

                    //Redirect to orders
                    res.redirect('/orders');
                })
                .catch((err) => {
                    console.log('Error in creating order or paying: ', err);
                    next(err);
                });

        }, (err) => next(err)) //sends the error to the error handler
        .catch((err) => next(err));
});

//After session and post route from stripe, because csrf token is stored in session
app.use(csrfProtection);

app.use((req, res, next) => {
    res.locals.user = req.user;
    res.locals.csrfToken = req.csrfToken(); //Pass the csrfToken which is in req to the view
    next();
});

app.use('/users', usersRouter);
app.use('/products', productRouter);
app.use('/cart', cartRouter);
app.use('/orders', orderRouter);
app.use('/', indexRouter);

// catch 404 and forward to error handler
/*app.use(function(req, res, next) {
    console.log('404 error');
    next(createError(404));
});*/

// error handler
app.use(function(err, req, res, next) {
    console.log('Error handler ',err);
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  //res.status(err.status || 500);
  res.render('error', {
      pageTitle: 'Error ' + err.status,
      active: 'error',
      user: req.session.user,
      isAdmin: req.session.isAdmin,
      isLoggedIn: req.session.authenticated
  });
});

module.exports = app;
