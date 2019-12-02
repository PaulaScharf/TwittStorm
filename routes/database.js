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
const mongodb = require('mongodb');


// TODO: alle nicht benötigten Routen löschen!!


// TODO: später löschen!!!
/* GET routes */
router.get("/routes", (req, res) => {
  var db = req.db;
  // find all
  db.collection('item').find({}).toArray((error, result) => {
    if(error){
      console.dir(error);
    }
    res.json(result);
  });
});




/* GET items */
router.post("/", function(req, res) {
  var db = req.db;
  console.dir(db);
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


// *********************** reading .......... : ***********************
/* GET one item */
router.post("/readItem", function(req, res) {

  // find item with given ID
  req.db.collection('item').findOne({
    "dwd_id" : req.body.dwd_id,
  }, (error, result) => {

    if (error){
      // give a notice, that reading all items has failed and show the error on the console
      console.log("Failure in reading one item from 'item'.", error);
      // in case of an error while reading, do routing to "error.ejs"
      res.render('error');
      // if no error occurs ...
    } else {
      // ... give a notice, that the reading has succeeded and show the result on the console
      console.log("Successfully read one item from 'item'.");
      // ... and send the result to the ajax request
      res.send(result);
    }
  });
});



// *********************** reading all current Unwetters: ***********************
router.post("/readCurrentUnwetters", function(req, res) {
  var db = req.db;

console.log(req.body.currentTimestamp);

  //
  db.collection('item').find({
    "properties.onset": {"$lt": req.body.currentTimestamp},
    "properties.expires": {"$gt": req.body.currentTimestamp},
   }).toArray((error, result) => {

    if (error){
      // give a notice, that reading all current Unwetter has failed and show the error on the console
      console.log("Failure in reading all current Unwetter from 'item'.", error);
      // in case of an error while reading, do routing to "error.ejs"
      res.render('error');
      // if no error occurs ...
    } else {
      // ... give a notice, that the reading has succeeded and show the result on the console
      console.log("Successfully read all current Unwetter from 'item'.");
      // ... and send the result to the ajax request
      res.json(result);
    }
  });
});



// *********************** inserting .........: ***********************
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


// *********************** deleting ...........: ***********************
/* DELETE item */
router.delete("/delete", (req, res) => {
  var db = req.db;
  // delete item
  let objectId = new mongodb.ObjectID(req.query._id);
  console.log("delete item " + objectId);
  db.collection('item').deleteOne({_id:objectId}, (error, result) => {
    if(error){
      // give a notice, that the deleting has failed and show the error on the console
      console.log("Failure while deleting an item from 'item'.", error);
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




/* update Unwetter */
router.put("/updateUnwetter", (req, res) => {

  var db = req.db;

  let id = req.body._id;
  console.log("update Unwetter " + id);
console.log(req.body.currentTimestamp);

  delete req.body._id;

  //
  db.collection('item').updateOne({_id: new mongodb.ObjectID(id)}, {$push: {timestamps: req.body.currentTimestamp}}, (error, result) => {

    if (error) {
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
