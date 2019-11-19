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

/* example code to work on, bypasses call of route
R("./node.R")
  .data({ "rasterProduct" : "rw", "classification" : "quantiles" })
  .call(function(err, d) {
    if (err) throw err;
    //TODO redirect d into mongoDB
    //console.log(d[1].classes[0]);
    var rasterMeta = d[0];
    var classBorders = d[1];

    //rasterMeta: meta from dwd raster, timestamp etc.
    //classBorders: info about classification intervals, important for display
    var answerJSON = {
      "type": "RainRadar",
      "rasterMeta": rasterMeta,
      "classBorders": classBorders,
      "geometry": {
        "type": "FeatureCollection",
        "features": []
      }
    };

    //make one big GeoJSON featurecollection
    for(let i = 2; i < d.length; i++) {
      var polygon = GeoJSONPolygon(d[i]);
      //push to collection
      answerJSON.geometry.features.push(polygon);
    }
  });
*/

/**
  * function to return a GeoJSON formatted Polygon
  * @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
  * @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
  * @param object part of the R JSON response, containing the coords of a polygon
  */
function GeoJSONPolygon(object) {
  var result = {
    "type": "Feature",
    "properties": {
    "class": object.class
  },
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        object.coords
      ]
    }
  };
  return result;
}

/* GET rasterProducts */
router.get("/:rasterProduct/:classification", function(req, res) {
  var db = req.db;
  var rasterProduct = req.params.rasterProduct;
  var classification = req.params.classification;

  //TODO check if this is already available
  //db search with current timestamp, depending on availability of rasterProduct

  //call R script
  R("./node.R")
    .data({ "rasterProduct": rasterProduct, "classification": classification})
    .call(function(err, d) {
      if(err) throw err;
      //TODO GeoJSONify response d
      var rasterMeta = d[0];
      var classBorders = d[1];
      var answerJSON = {
        "type": "RainRadar",
        "rasterMeta": rasterMeta,
        "classBorders": classBorders,
        "geometry": {
          "type": "FeatureCollection",
          "features": []
        }
      };

      //make one big GeoJSON featurecollection
      for(let i = 2; i < d.length; i++) {
        var polygon = GeoJSONPolygon(d[i]);
        //push to collection
        answerJSON.geometry.features.push(polygon);
      }
      //TODO POST to db
      console.log("got raster data, timestamp: " + answerJSON.rasterMeta.date + ", " + answerJSON.rasterMeta.product + " product");
      //TODO is return the right thing to do here?
      return answerJSON;
    });
});

//TODO connect to db get/post functionality

module.exports = router;
