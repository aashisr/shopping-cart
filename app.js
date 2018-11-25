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

const config = require('./config');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const productRouter = require('./routes/productRouter');
const cartRouter = require('./routes/cartRouter');
const orderRouter = require('./routes/orderRouter');
const Products = require('./models/products');
const Users = require('./models/users');

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

//After session, because csrf token is stored in session
app.use(csrfProtection);
//Flash should be initialized after session
app.use(flash());

app.use((req, res, next) => {
    res.locals.isLoggedIn = req.session.authenticated;
    res.locals.isAdmin = req.session.isAdmin;
    res.locals.csrfToken = req.csrfToken(); //Pass the csrfToken which is in req to the view
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

//Set local variables that are passed in to all the views that are rendered
app.use((req, res, next) => {
    console.log('Req in app.js is ', req.csrfToken());
    console.log('User in app.js is ', req.user);
    res.locals.user = req.user;
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
