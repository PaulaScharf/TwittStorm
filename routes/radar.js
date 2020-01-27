// jshint esversion: 8
// jshint node: true
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

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
  * @desc function to return a GeoJSON formatted Polygon. Intended to convert an input from an R script.
  * @author Jonathan Bahlmann
  * @param object part of the R JSON response, containing the coords of a polygon
  * @returns {GeoJSON Polygon} Polygon with class and geometry
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
  * @desc function to fetch the available radar files from DWD server as a List
  * @author Jonathan Bahlmann
  * @param {String} product radarProductCode such as sf, rw or ry
  * @returns {promise} promises to resolve to a fileList
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
  * @desc this function converts given timestamps and a radar product to a timespan in which the
  * timestamp of the actual radarproduct must lay. This is due to the delay of availability of radar products. The timestamp
  * that is given to the dwd files dos not match the time of availability
  * @author Paula Scharf, Jonathan Bahlmann
  * @param {String} radarProduct
  * @param timestamp
  * @returns array containing timespan [lower, upper] - borders
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
        variance = 1620000;
        access = 3600000;
      }
      if(prod == 'RW') {
        variance = 2040000;
        access = 3600000;
      }
      if(prod == 'RY') {
        variance = 120000;
        access = 300000;
      }

      let reqTime = timestamp + tz + variance - access;
      let reqTimeLower = reqTime - access;

      console.log("converting newDate timestamp " + new Date(timestamp));
      console.log(" .. to sequence: " + new Date(reqTime));
      console.log(" from [lower border] " + new Date(reqTimeLower));

      return [reqTimeLower, reqTime];
}

/**
  * @desc this function fetches the newest radar product from the dwd server. This is done through an R script that is called using
  * node 'r-script'.
  * @author Jonathan Bahlmann
  * @param {String} radarProduct radarProduct code, see wiki on github
  * @returns {promise} resolves to JSON desciption of the output rain Radar polygons
  */
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
        var timestampNow = Date.now();
        var timestampAvailability;
        if(radarProduct.toLowerCase() == "ry") {
          timestampAvailability = timestamp + 3720000;
        }
        if(radarProduct.toLowerCase() == "rw") {
          timestampAvailability = timestamp + 5160000;
        }
        if(radarProduct.toLowerCase() == "sf") {
          timestampAvailability = timestamp + 5580000;
        }
        /**
        console.log(new Date(timestamp));
        console.log(new Date(timestampNow));
        console.log(new Date(timestampAvailability));
        */

        var answerJSON = {
          "type": "rainRadar",
          "radarProduct": rasterMeta.product,
          "date": rasterMeta.date,
          "timestamp": timestamp,
          "timestampOfRequest": timestampNow,
          "timestampOfAvailability": timestampAvailability,
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
  * function in variable to execute the radar route. After conversion of the timestamps into "dwd-like" time, it checks whether
  * historic/demo data or live data should be fetched. Beofore fetching, a db check is done. The route cannot return any data that
  * is neither given demo data, arleady in the database or the newest data product.
  * the response is postet to req.res
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

    //console.log("latestDate = " + latestDate);

    // historic data? just above 60min
    let pastBorder;
    if(prod == "ry") {
      // 65min
      pastBorder = 3900000;
    }
    if(prod == "rw") {
      // 2h
      pastBorder = 7200000;
    }
    if(prod == "sf") {
      // 2h
      pastBorder = 7200000;
    }
    pastBorder = latestTimestamp - pastBorder;

    if(pastBorder > reqTimeLower) {
      console.log("rain radar: historic data requested");

      let query = {
        type: "rainRadar",
        radarProduct: prod.toUpperCase(),
        $and: [
          {"timestamp": {"$gt": (reqTimeLower)}},
          {"timestamp": {"$lte": (reqTimeUpper)}}
        ]
      };

      // look for historic data in db
      try {
        promiseToGetItems(query, req.db)
        .catch(console.error)
        .then(function(result) {
          if(result.length == 1) {
            res.send(result[0]);
          }
          if(result.length > 1) {
            res.send(result[0]);
          //  let e = "multiple files found.";
          //  res.status(500).send(e);
          }
          // if not found in db
          if(result.length < 1) {
            // read from hist data file
            var allProducts = [];

            // beautifully cascading part about reading all the demo data
            fs.readFile( './demo/radars_ry_1.txt', 'utf8', function (err, data) {
              if(err) {
                throw err;
              }
              else {
                let product = JSON.parse(data);
                allProducts.push(product);

                fs.readFile( './demo/radars_ry_2.txt', 'utf8', function (err, data) {
                  if(err) {
                    throw err;
                  }
                  else {
                    let product = JSON.parse(data);
                    allProducts.push(product);

                    fs.readFile( './demo/radars_ry_3.txt', 'utf8', function (err, data) {
                      if(err) {
                        throw err;
                      }
                      else {
                        let product = JSON.parse(data);
                        allProducts.push(product);

                        fs.readFile( './demo/radars_ry_4.txt', 'utf8', function (err, data) {
                          if(err) {
                            throw err;
                          }
                          else {
                            let product = JSON.parse(data);
                            allProducts.push(product);

                            fs.readFile( './demo/radars_rw_1.txt', 'utf8', function (err, data) {
                              if(err) {
                                throw err;
                              }
                              else {
                                let product = JSON.parse(data);
                                allProducts.push(product);

                                fs.readFile( './demo/radars_sf_1.txt', 'utf8', function (err, data) {
                                  if(err) {
                                    throw err;
                                  }
                                  else {
                                    let product = JSON.parse(data);
                                    allProducts.push(product);

                // post them to db
                try {
                  promiseToPostItems(allProducts, req.db)
                  .catch(console.error)
                  .then(function() {

                    let query = {
                      type: "rainRadar",
                      radarProduct: prod.toUpperCase(),
                      $and: [
                        {"timestamp": {"$gt": (reqTimeLower)}},
                        {"timestamp": {"$lte": (reqTimeUpper)}}
                      ]
                    };

                    // get them from db
                    try {
                      promiseToGetItems(query, req.db)
                      .catch(console.error)
                      .then(function(result) {
                        if(result.length == 1) {
                          res.send(result[0]);
                        }
                        else {
                          let e = "the requested timestamp lies in the past, with no matching historic data";
                          console.log(e);
                          e = { "err_msg": e };
                          res.status(404).send(e);
                        }
                      });
                    } catch(e) {
                      console.dir(e);
                      res.status(500).send(e);
                    }

                  });
                } catch(e) {
                  console.dir(e);
                  res.status(500).send(e);
                }
              }
            });

// and closing the demo-data-read. sorry about that.
}
});
}
});
}
});
}
});
}
});
//***************************************************


          }
        });
      } catch(e) {
        console.dir(e);
        res.status(500).send(e);
      }
    }
    // not historic data according to timestamps
    else {
      // if not old we can check db
      let query = {
        type: "rainRadar",
        radarProduct: prod.toUpperCase(),
        $and: [
          {"timestamp": {"$gt": (reqTimeLower)}},
          {"timestamp": {"$lte": (reqTimeUpper)}}
        ]
      };
      // db request
      try {
        promiseToGetItems(query, req.db)
        .catch(console.error)
        .then(function(result) {
          if(result.length == 1) {
            res.send(result[0]);
          }
          if(result.length > 1) {
            let e = "multiple files found.";
            res.status(500).send(e);
          }
          // not found
          if(result.length < 1) {
            // do we need to fetch the latest?
            if(reqTimeUpper > latestTimestamp && reqTimeLower < latestTimestamp) {
              // we dont have the newest, we should fetch it
              console.log("newest data is fetched ...");
              try {
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
                  } catch(e) {
                    console.dir(e);
                    res.status(500).send(e);
                  }
                });
              } catch(e) {
                console.dir(e);
                res.status(500).send(e);
              }
            }
            // no the latest
            else {
              // this could be because of dwd inconsitencies
              // when a new product should be available, but isn't due to dwd update difficulties
              if(reqTimeUpper > latestTimestamp && reqTimeLower > latestTimestamp) {
                console.log("the latest radar product is behind the requested timestamp");
                // query for last available prod
                let query = {
                  type: "rainRadar",
                  radarProduct: prod.toUpperCase(),
                  $and: [
                    {"timestamp": {"$lt": (reqTimeLower)}}
                  ]
                };
                try {
                  promiseToGetItems(query, req.db)
                  .catch(console.error)
                  .then(function(result) {
                    // forward it to response
                    res.send(result[result.length - 1]);
                  });
                } catch(e) {
                  console.dir(e);
                  res.status(500).send(e);
                }
              }
              else {
                // not the future case
                let e = "It is likely that a timestamp error occured. This is dueto DWD publishing delays. Please try again.";
                e = { "err_msg": e };
                res.status(404).send(e);
              }
            }
          }
        });
      } catch(e) {
        console.dir(e);
        res.status(500).send(e);
      }
    }
  });
};

// make this route available to the router
router.route("/:radarProduct/:timestamp").get(radarRoute);

router.route("*").get(function(req, res){
  res.status(422).send({err_msg: "Parameters are not valid"});
});

module.exports = router;
