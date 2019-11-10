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

// ********** load third-modules: (after installed using cmd: npm install ...) **********
var express = require('express');
var app = express();

var createError = require('http-errors');
var bodyParser = require('body-parser');
const mongodb = require('mongodb');

var JL = require('jsnlog').JL;
var jsnlog_nodejs = require('jsnlog-nodejs').jsnlog_nodejs;


// TODO: benutzen wir morgan?
var logger = require('morgan');


// set the routers-paths
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
const Twitter = require("twitter");
const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });


var client = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});


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



// activates the stream in the console when localhost:3000/tweets is called. Uses the twitter libary https://github.com/desmondmorris/node-twitter
app.get("/tweets", function(req, res) {
  console.log(client);
  var params = {
    screen_name: "Twittstormy",
    trim_user: true,
    exclude_replies: true,
    include_rts: false,
    count: 1
  };

  client.stream('statuses/filter', {track: 'weather'}, function(stream) {
    stream.on('data', function(event) {
      console.log(event && event.text);
    });

    stream.on('error', function(error) {
      throw error;
    });
  });



});



//  using the mongo-driver
const mongodb = require('mongodb');

// set the routes for npm-installed client-libraries
// TODO: leaflet löschen?
app.use("/leaflet", express.static(path.join(__dirname, 'node_modules', 'leaflet', 'dist')));
app.use("/jquery", express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist')));
app.use("/qunit", express.static(path.join(__dirname, 'node_modules', 'qunit', 'qunit')));
app.use("/bootstrap", express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));
app.use("/popper", express.static(path.join(__dirname, 'node_modules', 'popper.js', 'dist')));
app.use("/mapbox", express.static(path.join(__dirname, 'node_modules', 'mapbox-gl', 'dist')));
app.use("/mapbox-draw", express.static(path.join(__dirname, 'node_modules', '@mapbox', 'mapbox-gl-draw', 'dist')));
app.use("/jsnlog", express.static(path.join(__dirname, 'node_modules', 'jsnlog')));


// ********************************** JSNLog ***********************************

// "ensure that the JSON objects received from the client get parsed correctly"
app.use(bodyParser.json());

// jsnlog.js on the client-side sends log messages to /jsnlog.logger, using POST
app.post("/jsnlog.logger", function (req, res) {
  jsnlog_nodejs(JL, req.body);

  // jsnlog on the client-side does not use the response from server, therefore send an empty response
  res.send('');
});



// ************************ mongo-database connection **************************
/**
*
* Try to connect to mongodb on localhost:27017 (if not using docker),
* if not possible try to connect on mongodbservice:27017 (if using docker),
* if not possible print the error.
*
*/
function connectMongoDb() {

  (async () => {
    // try to connect to mongodb on localhost:27017
    try {
      // await blocks and waits for connection, because here synchronous execution is desired
      app.locals.dbConnection = await mongodb.MongoClient.connect(
        // connectionString / connection URL:
        "mongodb://localhost:27017",
        {
          useNewUrlParser: true,
          autoReconnect: true,
          useUnifiedTopology: true
        }
      );
      // connect to and use database "itemdb" (create this database, if it does not exist)
      app.locals.db = await app.locals.dbConnection.db("itemdb");
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
          "mongodb://mongodbservice:27017",
          {
            useNewUrlParser: true,
            autoReconnect: true,
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


// middleware for making the db connection available via the request object
app.use((req, res, next) => {
  req.db = app.locals.db;
  next();
});



// index-router
app.use('/', indexRouter);
//
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
