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

/* GET raster data as polygons */
/* returns JSON ready to be put into DB */
router.get("/:radarProduct/:classification", function(req, res) {
  var db = req.db;
  var radarProduct = req.params.radarProduct;
  var classification = req.params.classification;

  //TODO check if this is already available
  //db search with current timestamp, depending on availability of radarProduct
  //call R script
  R("./node.R")
    .data({ "radarProduct": radarProduct, "classification": classification})
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
      //console.log("got raster data, timestamp: " + answerJSON.rasterMeta.date + ", " + answerJSON.rasterMeta.product + " product");

      //send response, response is db-object like JSON
      res.send(answerJSON);
    });
});

//TODO connect to db get/post functionality

module.exports = router;
