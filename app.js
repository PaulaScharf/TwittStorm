// jshint esversion: 8
// jshint node: true
"use strict";


var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//  using the mongo-driver
const mongodb = require('mongodb');

function connectMongoDb() {

  (async () => {
try {
  app.locals.dbConnection = await mongodb.MongoClient.connect(
    "mongodb://localhost:27017",
    {
      useNewUrlParser: true
    }
  );
  app.locals.db = await app.locals.dbConnection.db("itemdb");
  console.log("Using Database " + app.locals.db.databaseName);

} catch(error) {
  try {

  app.locals.dbConnection = await mongodb.MongoClient.connect(
    "mongodb://mongodbservice:27017",
    {
      useNewUrlParser: true
    }
  );
  app.locals.db = await app.locals.dbConnection.db("itemdb");
  console.log("Using Database " + app.locals.db.databaseName);


} catch (error) {
  console.log(error.message);
}
}
}
)();
}

connectMongoDb();

// middleware for making the db connection available via the request object
app.use((req, res, next) => {
  req.db = app.locals.db;
  next();
});


app.use("/leaflet", express.static(__dirname + "/node_modules/leaflet/dist"));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/qunit', express.static(__dirname + '/node_modules/qunit/qunit'));
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist'));
app.use('/popper', express.static(__dirname + '/node_modules/popper.js/dist'));
app.use('/', indexRouter);
app.use('/users', usersRouter);

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
