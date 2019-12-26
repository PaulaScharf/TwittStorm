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

function findLastTimestamp(product, timestampString) {

    return new Promise((resolve, reject) => {
      R("./getFileList.R")
        .data({ "radarProduct": product })
        .call(function(err, fileList) {
          if(err) throw err;

          // from returned file list
          // parse the latest available product


          let latest = fileList[fileList.length - 1].slice(16,26);
          console.log(latest);
          latest = "20" + latest.slice(0, 2) + "-" + latest.slice(2, 4) + "-" + latest.slice(4, 6) + " " +
          latest.slice(6, 8) + ":" + latest.slice(8, 10);
          let latestDate = new Date(latest);
          let latestDateStamp = latestDate.getTime();
          console.log(latest);

          // and also parse the second latest available product
          let secondLatest = fileList[fileList.length - 2].slice(16,26);
          secondLatest = "20" + secondLatest.slice(0, 2) + "-" + secondLatest.slice(2, 4) + "-" + secondLatest.slice(4, 6) + " " +
          secondLatest.slice(6, 8) + ":" + secondLatest.slice(8, 10);
          let secondLatestDate = new Date(secondLatest);
          let secondLatestDateStamp = secondLatestDate.getTime();
          console.log(secondLatest);

          // now handle input
          // and parse the timestamp that we need a product for
          let prod = product.toUpperCase();
          let timestamp = parseInt(timestampString);
          let timestampDate = new Date(timestamp);
          console.log("ts: " + timestampDate);

          // now there are different cases


          // SF or RW products
          if(prod == 'SF' || prod == 'RW') {
            let until = 50;

            while(timestampDate.getMinutes() != until) {
              timestampDate.setMinutes(timestampDate.getMinutes() - 1);
            }
          }
          if(prod == 'RY') {
            let mod = 5;
            while(timestampDate.getMinutes() % mod != 0) {
              console.log(timestampDate.getMinutes());
              timestampDate.setMinutes(timestampDate.getMinutes() - 1);
            }
          }
          console.log("fnd:" + timestampDate);



          if(fileList) {
            resolve(fileList);
          } else {
            let e = "Couldn't fetch fileList from DWD server.";
            console.log(e);
            reject(e);
          }

        });
      });
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

      let reqTime = timestamp + tz + variance - access + 1000;
      let reqTimeLower = reqTime - access;

      console.log("timestamp   : " + new Date(timestamp) + " // " + timestamp);
      console.log("timestamp is: " + timestamp);

      // query with calculated timespan
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

      findLastTimestamp(req.params.radarProduct, req.params.timestamp);
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
          res.send(response[0]);
          }
        } catch (e) {
          console.dir(e);
          res.status(500).send(e);
        }
      }
    });
};

// make route call the function
//router.route("/:radarProduct/:timestamp").get(radarDataRoute);

/**
  * function to fetch the available radar files from DWD server
  * @author Jonathan Bahlmann
  * @param product radarProductCode such as sf, rw or ry
  * @returns {promise} promises to resolve to fileList
  */
function findLastTimestamp(product) {
    return new Promise((resolve, reject) => {
      R("./getFileList.R")
        .data({ "radarProduct": product })
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
  * function that checks the database for a radarProduct with an exact timestampString
  * @author Paula Scharf, Jonathan Bahlmann
  * @param prod radarProductCode of searched item
  * @param timestampString the exact timestamp of the product you're looking for
  * @param db reference to the db
  */
function checkDatabase(prod, timestampString, db) {
  return new Promise((resolve, reject) => {
      // prod is uppercase product code
      prod = prod.toUpperCase();
      let timestamp = parseInt(timestampString);

      // query with given timestamp
      let query = {
        type: "rainRadar",
        radarProduct: prod,
        timestamp: timestamp
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

/**
  * function in variable to execute the "radar-latest" route
  * posts to req.res
  * @author Paula Scharf, Jonathan Bahlmann
  * @param req the request object
  * @param res the response object
  */
var radarRouteLatest = function(req, res) {

  let prod = req.params.radarProduct.toLowerCase();

  // get a filelist of all available radar data
  findLastTimestamp(prod)
  .catch(console.error)
  .then(function(fileList) {

    // parse the latest entry into a Date
    let latest = fileList[fileList.length - 1].slice(16,26);
    latest = "20" + latest.slice(0, 2) + "-" + latest.slice(2, 4) + "-" + latest.slice(4, 6) + " " +
    latest.slice(6, 8) + ":" + latest.slice(8, 10);
    let latestDate = new Date(latest);
    let latestDateStamp = latestDate.getTime();

    // check the database for that latest radar product
    checkDatabase(prod, latestDateStamp, req.db)
    .catch(console.error)
    .then(function(response) {
      // when the latest product is not yet in the database
      if(!response) {
        console.log("no radar " + prod + " data found for requested timestamp, fetching ...");
        // fetch new data
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

      // if the data is found in the database
      else {
        console.log("radar data found, forwarding ...");
        try {
          // in case there are multiple files found, write message in console
          if(response.length > 1) {
            let e = "Multiple radar Files found for the requested timestamp";
            console.dir(e);
          }
          // forward to response
          res.send(response[0]);
        } catch (e) {
          console.dir(e);
          res.status(500).send(e);
        }
      }
    });
  });
};

// make this route available to the router
router.route("/:radarProduct/latest").get(radarRouteLatest);

module.exports = router;
