// jshint esversion: 8
// jshint node: true
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/

var express = require('express');
var router = express.Router();
var R = require('r-script');
const mongodb = require('mongodb');

R("./node.R")
  .data({ "rasterProduct" : "rw", "classification" : "quantiles" })
  .call(function(err, d) {
    if (err) throw err;
    //TODO redirect d into mongoDB
    console.log(d);
  });

router.get("/:rasterProduct/:classification", function(req, res) {
  var db = req.db;
  var rasterProduct = req.params.rasterProduct;
  var classification = req.params.classification;

  //TODO check if this is already available

  //call R script
  R("./node.R")
    .data({ "rasterProduct": rasterProduct, "classification": classification})
    .call(function(err, d) {
      if(err) throw err;
      //TODO redirect d into mongoDB
      console.log(d);
    });
});

//TODO output to GeoJSON
//TODO give path as input to R script
//TODO connect to db get functionality

//*******************************DB FUNCTIONALITY*****************************
/* GET items */
router.post("/", function(req, res) {
  var db = req.db;
  let query = {};
  for (let key in req.body) {
    if (req.body.hasOwnProperty(key)) {
      query[key] = req.body[key];
    }
  }
  // find all
  db.collection('item').find(query).toArray((error, result) => {
    if(error){
      // give a notice, that reading all items has failed and show the error on the console
      console.log("Failure in reading all items from 'item'.", error);
      // in case of an error while reading, do routing to "error.ejs"
      res.render('error');
      //       // if no error occurs ...
    } else {
      // ... give a notice, that the reading has succeeded and show the result on the console
      console.log("Successfully read the items from 'item'.");
      // ... and send the result to the ajax request
      res.json(result);
    }
  });
});


/* POST to add items. */
router.post('/add', function(req, res) {
  var db = req.db;

  db.collection('item').insertOne(req.body, (error, result) => {
    if(error){
      // give a notice, that the inserting has failed and show the error on the console
      console.log("Failure while inserting an item into 'item'.", error);
      // in case of an error while inserting, do routing to "error.ejs"
      res.render('error');
      // if no error occurs ...
    } else {
      // ... give a notice, that inserting the item has succeeded
      res.json({
        error: 0,
        msg: "item mit der ID " + result.insertedId + " angelegt."
      });
    }
  });

});

/* DELETE item */
router.delete("/delete", (req, res) => {
  var db = req.db;
  // delete item
  let objectId = new mongodb.ObjectID(req.query._id);
  console.log("delete item " + objectId);
  db.collection('item').deleteOne({_id:objectId}, (error, result) => {
    if(error){
      // give a notice, that the deleting has failed and show the error on the console
      console.log("Failure while deleting an encounter from 'routeDB'.", error);
      // in case of an error while deleting, do routing to "error.ejs"
      res.render('error');
      // if no error occurs ...
    } else {
      // ... give a notice, that deleting the item has succeeded
      console.log("Successfully deleted an item from 'item'.");
      res.json(result);
    }
  });
});

/* PUT item */
router.put("/update", (req, res) => {
  var db = req.db;
  // update item
  console.log("update item " + req.body._id);
  let id = req.body._id;
  delete req.body._id;
  console.log(req.body); // => { name:req.body.name, description:req.body.description }
  db.collection('item').updateOne({_id:new mongodb.ObjectID(id)}, {$set: req.body}, (error, result) => {
    if(error){
      // give a notice, that the updating has failed and show the error on the console
      console.log("Failure while updating an item in 'item'.", error);
      // in case of an error while updating, do routing to "error.ejs"
      res.render('error');
      // if no error occurs ...
    } else {
      // ... give a notice, that updating the item has succeeded
      console.log("Successfully updated an item in 'item'.");
      res.json(result);
    }
  });
});

module.exports = router;
