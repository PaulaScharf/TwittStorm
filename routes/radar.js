// jshint esversion: 8
// jshint node: true
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

//TODO if nothing found on db, newest is fetched -> func for telling that data from the past will not be returned
//TODO maybe error handling func that checks timespan and req time
//TODO or make sure that radarDataRoute does an extra fetch
//TODO documentation

// this file contains functions not used yet, they are part of the work in progress route /:product/:timestamp instead of
// /:product/latest

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/

const {promiseToGetItems,promiseToPostItems} = require('./dataPromisesHelpers.js');


var express = require('express');
var router = express.Router();
var R = require('r-script');
//const mongodb = require('mongodb');

// yaml configuration
const fs = require('fs');
const yaml = require('js-yaml');
var config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));


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
  * function to fetch the available radar files from DWD server
  * @author Jonathan Bahlmann
  * @param product radarProductCode such as sf, rw or ry
  * @returns {promise} promises to resolve to fileList
  */
function findLastTimestamp(product) {
    return new Promise((resolve, reject) => {
      R("./getFileList.R")
        .data({ "radarProduct": product, "dwdUrl": config.dwd.radar })
        .call(function(err, fileList) {
          if(err) throw err;


          if(fileList) {
            resolve(fileList);
          } else {
            let e = "Couldn't fetch Filelist from DWD server.";
            console.log(e);
            reject(e);
          }

        });
      });
}

/**
  * @desc this function returns converts given timestamps and a radar product toa timespan in which the
  * timestamp of the actual radarproduct must lay
  * @author Paula Scharf, Jonathan Bahlmann
  * @param {string} radarProduct
  * @param timestamp
  * @param db
  * @returns array containing timespan
  */
function convertTimestamp(radarProduct, timestampString) {
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
        variance = 1560000;
        access = 3600000;
      }
      if(prod == 'RW') {
        variance = 1980000;
        access = 3600000;
      }
      if(prod == 'RY') {
        variance = 180000;
        access = 300000;
      }

      let reqTime = timestamp + tz + variance - access;
      let reqTimeLower = reqTime - access;

      console.log("converting " + new Date(timestamp) + " .. to sequence: " + new Date(reqTime));
      console.log(" from [lower border] " + new Date(reqTimeLower));

      return [reqTimeLower, reqTime];
}

var promiseToFetchRadarData = function(radarProduct) {

  let classification = "dwd";

  return new Promise((resolve, reject) => {
    R("./node.R")
      .data({ "radarProduct": radarProduct, "classification": classification, "dwdUrl": config.dwd.radar })
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

/**
  * function in variable to execute the "radar-latest" route
  * posts to req.res
  * @author Paula Scharf, Jonathan Bahlmann
  * @param req the request object
  * @param res the response object
  */
var radarRoute = function(req, res) {

  let prod = req.params.radarProduct.toLowerCase();

  // calculate timespan
  let interval = convertTimestamp(prod, req.params.timestamp);
  let reqTimeUpper = interval[1];
  let reqTimeLower = interval[0];

  // get a filelist of all available radar data
  findLastTimestamp(prod)
  .catch(console.error)
  .then(function(fileList) {

    // parse the latest entry into a Date
    let latest = fileList[fileList.length - 1].slice(16,26);
    latest = "20" + latest.slice(0, 2) + "-" + latest.slice(2, 4) + "-" + latest.slice(4, 6) + " " +
    latest.slice(6, 8) + ":" + latest.slice(8, 10);
    let latestDate = new Date(latest);
    let latestTimestamp = latestDate.getTime();

    // future
    if(reqTimeUpper > latestTimestamp && reqTimeLower > latestTimestamp) {
      console.log("the requested timestamp lies in the future somehow");
    }
    // if not, we can already check the database
    let query = {
      type: "rainRadar",
      radarProduct: prod.toUpperCase(),
      $and: [
        {"timestamp": {"$gt": (reqTimeLower)}},
        {"timestamp": {"$lte": (reqTimeUpper)}}
      ]
    };
    // db request
    promiseToGetItems(query, req.db)
      .catch(console.error)
      .then(function(result) {

        console.log("result from database length: " + result.length);

        // if no data found
        if(result.length < 1) {
          // see if the newest image is meant by the requested timestamp
          if(reqTimeUpper > latestTimestamp && reqTimeLower < latestTimestamp) {
            // we dont have the newest, we should fetch it
            console.log("newest data is fetched ...");
            promiseToFetchRadarData(prod)
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
          // somesting from the past is requested that we cannot find in the db
          else {
            res.status(404).send({err_msg: "radar Product not found."});
          }
        }
        // if one data found
        if(result.length == 1) {
          // if we found something we can return it without anything else
          console.log("radar data found in db, forwarding ...");
          console.log(result[0].date);
          res.send(result[0]);
        }
        // multiple files found
        if(result.length > 1) {
          let array = [];
          result.forEach(function(image) {
            array.push(image.date);
          });
          let e = "multiple images found";
          res.status(500).send(e);
        }

      });
  });
};

// make this route available to the router
router.route("/:radarProduct/:timestamp").get(radarRoute);

router.route("*").get(function(req, res){
  res.status(404).send({err_msg: "Parameters are not valid"});
});

module.exports = router;
