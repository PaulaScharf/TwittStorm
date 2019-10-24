// jshint esversion: 8
// jshint node: true
"use strict";

var express = require('express');
var router = express.Router();

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

/* POST to add route. */
router.post('/addroute', function(req, res) {
  var db = req.db;

  console.dir(req.body);
  var routeData = req.body;

  db.collection('item').insertOne(req.body, (error, result) => {
    if(error){
      res.json({msg: "error", error: 1});
    }
    console.dir(result);
    console.log(result.insertedId);
    routeData._id = result.insertedId;
    res.json({
      data: routeData,
      error: 0,
      msg: "Route mit der ID "+routeData._id+" angelegt."
    });
  });

});

/* DELETE route */
const mongodb = require('mongodb');
router.delete("/deleteroute/:id", (req, res) => {
  var db = req.db;
  // delete item
  console.log("delete item " + req.params.id);
  let objectId = "ObjectId(" + req.params.id + ")";
  db.collection('item').deleteOne({_id:new mongodb.ObjectID(req.params.id)}, (error, result) => {
    if(error){
      console.dir(error);
    }
    res.json(result);
  });
});

/* PUT route */
router.put("/putroute", (req, res) => {
  var db = req.db;
  // update item
  console.log("update item " + req.body._id);
  let id = req.body._id;
  delete req.body._id;
  console.log(req.body); // => { name:req.body.name, description:req.body.description }
  db.collection('item').updateOne({_id:new mongodb.ObjectID(id)}, {$set: req.body}, (error, result) => {
    if(error){
      console.dir(error);
    }
    res.json(result);
  });
});

module.exports = router;
