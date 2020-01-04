// jshint esversion: 8
// jshint node: true
// jshint maxerr: 1000

"use strict"; // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/


// ********** load modules: **********
const http = require("http");
const https = require("https");
const path = require('path');

// ********** load third-modules: **********
var express = require('express');
var app = express();

var createError = require('http-errors');
var bodyParser = require('body-parser');
const mongodb = require('mongodb');   // using the mongo-driver

var JL = require('jsnlog').JL;
var jsnlog_nodejs = require('jsnlog-nodejs').jsnlog_nodejs;

// TODO: benutzen wir morgan?
var logger = require('morgan');

// R
const R = require('r-script');

// yaml configuration
const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));

// set the routers-paths
var indexRouter = require('./routes/index');
var warningsRouter = require('./routes/warnings');
var radarRouter = require('./routes/radar');
var twitterRouter = require('./routes/twitter');
var configRouter = require('./routes/configuration');
var animationRouter = require('./routes/animation');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// TODO: unnötig, löschen?
app.use(logger('dev'));

// load/provide all files given in the folder public
app.use(express.static(path.join(__dirname, 'public')));

// use built-in middleware which parses incoming requests with JSON payloads so that explicit parse expressions for every JSON are not necessary
app.use(express.json());

// use built-in middleware which parses urlencoded bodies, https://expressjs.com/en/4x/api.html#express.urlencoded
app.use(express.urlencoded({ extended: false }));

// TODO: wozu benutzen wir das?
//app.use(cookieParser());


// set the routes for npm-installed client-libraries
app.use("/jquery", express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist')));
app.use("/qunit", express.static(path.join(__dirname, 'node_modules', 'qunit', 'qunit')));
app.use("/bootstrap", express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use("/popper", express.static(path.join(__dirname, 'node_modules', 'popper.js', 'dist')));
app.use("/mapbox", express.static(path.join(__dirname, 'node_modules', 'mapbox-gl', 'dist')));
app.use("/mapbox-draw", express.static(path.join(__dirname, 'node_modules', '@mapbox', 'mapbox-gl-draw', 'dist')));
app.use("/turf", express.static(path.join(__dirname, 'node_modules', '@turf')));
app.use("/jsnlog", express.static(path.join(__dirname, 'node_modules', 'jsnlog')));
app.use("/R", express.static(path.join(__dirname, 'node_modules', 'r-script', )));
app.use("/leaflet", express.static(path.join(__dirname, 'node_modules', 'leaflet', 'dist')));

// ***************************** mongo-database *******************************

// middleware for making the db connection available via the request object
app.use((req, res, next) => {
  req.db = app.locals.db;
  next();
});


/**
* Try to connect to mongodb on localhost:27017 (if not using docker),
* if not possible try to connect on mongodbservice:27017 (if using docker),
* if not possible print the error.
*/
function connectMongoDb() {

  (async () => {
    // try to connect to mongodb on localhost:27017
    try {
      // await blocks and waits for connection, because here synchronous execution is desired
      app.locals.dbConnection = await mongodb.MongoClient.connect(
        // connectionString / connection URL:
        "mongodb://" + config.mongodb.host + ":" + config.mongodb.port,
        {
          useNewUrlParser: true,
          useUnifiedTopology: true
        }
      );
      // connect to and use database "itemdb" (create this database, if it does not exist)
      app.locals.db = await app.locals.dbConnection.db(config.mongodb.db_name);
      // tell the user that the connection is established and database "itemdb" will be used for following operations
      console.log("Using Database " + app.locals.db.databaseName);

      // tell the user the URL for starting the application
      console.log("URL for starting the app: http://localhost:3000/");

      // catch possible errors and tell the user about them:
    } catch (error) {

      // for using docker:
      // try to connect to mongodb on mongodbservice:27017
      try {
        // await blocks and waits for connection, because here synchronous execution is desired
        app.locals.dbConnection = await mongodb.MongoClient.connect(
          // connectionString / connection URL: docker container "mongodbservice"
          "mongodb://mongodbservice:"  + config.mongodb.port,
          {
            useNewUrlParser: true,
            useUnifiedTopology: true
          }
        );
        // connect to and use database "itemdb" (create this database, if it does not exist)
        app.locals.db = await app.locals.dbConnection.db("itemdb");
        // tell the user that the connection is established and database "itemdb" will be used for following operations
        console.log("Using Database " + app.locals.db.databaseName);

        // TODO: stimmt folgende URL hier noch?
        // tell the user the URL for starting the application
        console.log("URL for starting the app: http://localhost:3000/");

        // if it is not possible to connect on localhost:27017 or mongodbservice:27017,
        // catch possible errors and print them in the console:
      } catch (error) {
        console.log(error.message);
        console.dir(error);

        // retry until db-server is up
        setTimeout(connectMongoDb, 3000);
      }
    }
  }
)();
}

// call function above to connect to MongoDB
connectMongoDb();



// ********************************** JSNLog ***********************************

// "ensure that the JSON objects received from the client get parsed correctly"
app.use(bodyParser.json());

// jsnlog.js on the client-side sends log messages to /jsnlog.logger, using POST
app.post("/jsnlog.logger", function (req, res) {
  jsnlog_nodejs(JL, req.body);

  // jsnlog on the client-side does not use the response from server, therefore send an empty response
  res.send('');
});


// *****************************************************************************

// index-router
app.use('/', indexRouter);
//
app.use('/warnings', warningsRouter);
//
app.use('/radar', radarRouter);
//
app.use('/twitter', twitterRouter);
//
app.use('/config', configRouter);
//
app.use('/previousWeather', animationRouter);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.status(404).send({err_msg: "Not Found"});
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  // respond with html page
  res.send({
    err_msg: err.message
  });
});


module.exports = app;
