const path = require('path');

const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
//for storing the sessions in mongodb
const MongoDBStore = require('connect-mongodb-session')(session);

//Mongoose helps to impose a structure on the documents that is going to be stored in the database collection
const mongoose = require('mongoose');

const config = require('./config');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const productRouter = require('./routes/productRouter');
const Products = require('./models/products');

//url to connect to mongodb, imported from config.js
const url = config.mongoUrl;

//Establish a connection with the database and store in connect variable
//Since current URL string parser is deprecated, new URL parser is being used
const connect = mongoose.connect(url, {useNewUrlParser: true});

//Now, connect the database and do database operations
connect.then((db) => {
    console.log('Connected to the server');

}, (err) => {
    console.log(err)
}); //Console log the error

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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

app.use('/products', productRouter);
app.use('/users', usersRouter);
app.use('/', indexRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
