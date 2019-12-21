// jshint esversion: 8
// jshint node: true
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

//TODO when data found, response is [] array -> needs to be pure JSON
//TODO if nothing found on db, newest is fetched -> func for telling that data from the past will not be returned
//TODO or make sure that radarDataRoute does an extra fetch

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/

const {promiseToGetItems,promiseToPostItems} = require('./dataPromisesHelpers.js');


var express = require('express');
var router = express.Router();
var R = require('r-script');
//const mongodb = require('mongodb');


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

/**
  * @author Paula Scharf, Jonathan Bahlmann
  * @param {string} radarProduct
  * @param timestamp
  * @param db
  */
function checkForExistingRadar(radarProduct, timestampString, db) {
  return new Promise((resolve, reject) => {
      // prod is uppercase product code
      let prod = radarProduct.toUpperCase();
      let timestamp = parseInt(timestampString);
      // products are accessible after the posted interval (5mins, 60mins, 60mins)
      let access;
      // product are accessible after varying processing time
      let variance;
      // get Timezone offset milliseconds
      let tz = new Date(timestamp);
      tz = tz.getTimezoneOffset();
      tz = tz * 60000;

      if(prod == 'SF') {
        variance = 1980000;
        access = 3600000;
      }
      if(prod == 'RW') {
        variance = 1620000;
        access = 3600000;
      }
      if(prod == 'RY') {
        variance = 240000;
        access = 300000;
      }

      let reqTime = timestamp + tz + variance - access;
      let reqTimeLower = reqTime - 3600000;
      let reqTimeHigher = reqTime + 3600000;

      console.log("timestamp: " + new Date(timestamp));
      console.log("stamp + tz: " + new Date(timestamp + tz));
      console.log("stamp + tz - var: " + new Date(timestamp + tz + variance));
      console.log("stamp + tz - var - acc: " + new Date(timestamp + tz + variance - access));
      console.log(reqTimeLower + " - " + reqTime + " - " + reqTimeHigher);

      //console.log(new Date(reqTime) + " -to- " + new Date(reqTimeHigher));

      // JSON with the ID of the current Unwetter, needed for following database-check
      let query = {
        type: "rainRadar",
        radarProduct: prod,
        $and: [
          {"timestamp": {"$gt": (reqTimeLower)}},
          {"timestamp": {"$lt": (reqTime)}}
        ]
      };
    promiseToGetItems(query, db)
      .catch(function (error) {
        reject(error);
      })
      .then(function (result) {
        if (result.length > 0) {
          resolve(result);
        } else {
          resolve(false);
        }
      });
  });
}

var promiseToFetchRadarData = function(radarProduct) {

  let classification = "dwd";

  return new Promise((resolve, reject) => {
    R("./node.R")
      .data({ "radarProduct": radarProduct, "classification": classification})
      .call(function(err, d) {
        if(err) throw err;

        var rasterMeta = d[0];
        var classBorders = d[1];
        var timestamp = Date.parse(rasterMeta.date);
        var answerJSON = {
          "type": "rainRadar",
          "radarProduct": rasterMeta.product,
          "date": rasterMeta.date,
          "timestamp": timestamp,
          "classBorders": classBorders,
          "classInformation": classBorders.classes,
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

        if(answerJSON) {
          resolve(answerJSON);
        } else {
          resolve(false);
        }
      });
    });
};

var radarDataRoute = function(req, res) {
  checkForExistingRadar(req.params.radarProduct, req.params.timestamp, req.db)
    .catch(console.error)
    .then(function(response) {
      // if no data is cached in db
      if(!response) {
        console.log("no radar " + req.params.radarProduct + " data found for requested timestamp, fetching ...");
        // fetch new data
        promiseToFetchRadarData(req.params.radarProduct)
          .catch(console.error)
          .then(function(radarPolygonsJSON) {
            try {
              // post it to DB
              promiseToPostItems([radarPolygonsJSON], req.db)
                .catch(console.error)
                .then( function() {
                  // and send the JSON to the endpoint as response
                  res.send(radarPolygonsJSON);
                }
              );
            } catch (e) {
              console.dir(e);
              res.status(500).send(e);
            }
          });
      }
      // if data is cached in db
      else {
        console.log("radar data found, forwarding ...");
        try {
          if(response.length > 3) {
            let e = "Error: multiple radar Files found for the requested timestamp";
            console.dir(e);
            res.status(500).send(e);
          } else {
          // forward to response
          res.send(response);
          }
        } catch (e) {
          console.dir(e);
          res.status(500).send(e);
        }

      }

    });
};

// make route call the function
router.route("/:radarProduct/:timestamp").get(radarDataRoute);

module.exports = router;
