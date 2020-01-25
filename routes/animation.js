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

// yaml configuration
const fs = require('fs');
const yaml = require('js-yaml');
var config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));

const {promiseToGetItems,promiseToPostItems} = require('./dataPromisesHelpers.js');


/**
 * This retrieves weather events from the past 50 minutes and gives the to the result object.
 * @param req - request
 * @param res - result
 */
var previousWeather = function(req, res) {
  config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));

  let validParams = checkParams(req.params);

  if (validParams.err_message !== "") {
    if (!res.headersSent) {
      res.status(422).send(validParams);
    }
  } else {
    const config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));

    var wtype = req.params.wtype;
    var currentTimestamp = req.params.currentTimestamp;


    if(wtype == "unwetter") {

      let query = {
        "type": wtype,
        "timestamps": {
          "$elemMatch": {
            "$lte": JSON.parse(currentTimestamp),
            "$gte": (JSON.parse(currentTimestamp) - 10 * config.refresh_rate)
          }
        }
      };
      promiseToGetItems(query, req.db)
        .catch(function(error) {
          if (!res.headersSent) {
            res.status(500).send({err_msg: error});
          }
        })
        .then(async (response) => {
          try {
            // this will be the response of the request
            let weatherEvents = {
              "type": (wtype === "unwetter") ? "severeWeatherWarnings" : "rainRadar"
            };
            // this array will contain the timestamps of all the events that were returned
            let arrayOfTimestamps = [];
            response.forEach(function (event) {
              event.timestamps.forEach(function (timestamp) {
                if (!arrayOfTimestamps.includes(timestamp)) {
                  arrayOfTimestamps.push(timestamp);
                }
              });
            });
            arrayOfTimestamps.sort(function (a, b) {
              return a - b;
            });
            // if the response includes more than 10 timestamp only choose the 10 most recent ones
            if (arrayOfTimestamps.length > 10) {
              arrayOfTimestamps = arrayOfTimestamps.slice(0, 10);
            }
            let arrayOfPromises = [];
            arrayOfTimestamps.forEach( (timestamp) => {
              if (!weatherEvents[timestamp]) {
                weatherEvents[timestamp] = [];
              }
              response.forEach(function (event) {
                if (event.timestamps.includes(timestamp) &&
                  ((event.properties.onset) ? true : (event.properties.onset <= timestamp)) &&
                  ((event.properties.expires) ? true : (event.properties.expires > timestamp))) {
                  weatherEvents[timestamp].push(event);
                  arrayOfPromises.push(promiseToGetTweetsForEvent(event.dwd_id, timestamp, req.db)
                    .catch(function(error) {
                      if (!res.headersSent) {
                        res.status(500).send({err_msg: error});
                      }
                    })
                    .then(function (tweets) {
                      tweets.forEach(function (tweet) {
                        weatherEvents[timestamp].push(tweet);
                      });
                    })
                    .catch(function(error) {
                      if (!res.headersSent) {
                        res.status(500).send({err_msg: error});
                      }
                    }));
                }
              });
            });
            await Promise.all(arrayOfPromises);
            if (!res.headersSent) {
              res.json(weatherEvents);
            }
          } catch(error) {
            if (!res.headersSent) {
              res.status(500).send({err_msg: error});
            }
          }
        });
    }

    // if searching for old radar data
    if(wtype == "rainRadar") {

      // product handling
      let prod;
      // products are accessible after the posted interval (5mins, 60mins, 60mins)
      let access;
      // product are accessible after varying processing time
      let variance;

      currentTimestamp = parseInt(currentTimestamp);
      // get Timezone offset milliseconds
      let tz = new Date(currentTimestamp);
      tz = tz.getTimezoneOffset();
      tz = tz * 60000;
      // config.refresh rate is treated as interval for time steps
      // timestamp needs to be handles accordingly
      if(config.refresh_rate < 3600000) {
        // when interval < 1h, use ry product
        prod = "RY";
        variance = 180000;
        access = 300000;
      } else {
        // when interval > 1h, use rw hourly sum
        prod = "RW";
        variance = 1980000;
        access = 3600000;
      }
      // calculate query time from above offsets etc.
      let lastTimestamp = currentTimestamp + tz + variance - access;
      // go 10 timesteps back
      let firstTimestamp = lastTimestamp - 11 * config.refresh_rate;

      let query = {
        "type": wtype,
        "radarProduct": prod,
        $and: [
          {"timestamp": {"$gt": (firstTimestamp)}},
          {"timestamp": {"$lte": (lastTimestamp)}}
        ]
      };

      promiseToGetItems(query, req.db)
        .catch(function(error) {
          if (!res.headersSent) {
            res.status(500).send({err_msg: error});
          }
        })
        .then(function(result) {
          // are we looking for not-yet loaded historic data?
          let pastBorder;
          if(prod == "RY") {
            // 65min
            pastBorder = 3900000;
          }
          if(prod == "RW") {
            // 2h
            pastBorder = 7200000;
          }
          pastBorder = Date.now() - pastBorder;
          let bool = pastBorder > lastTimestamp;
          console.log("prevWeather radar check: " + new Date(pastBorder) + " > " + new Date(lastTimestamp) + " ? -> " + bool);

          if(pastBorder > lastTimestamp) {
            // TODO if < 5 found, reload
            if(result.length < 5) {
              // read from hist data file
              var allProducts = [];

              // beatuifully cascading part about reading all the demo data
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

                              let loadProducts = [];

                              allProducts.forEach(function(image) {
                                let load = true;
                                result.forEach(function(resultImage) {
                                  if(image.timestamp == resultImage.timestamp) {
                                    load = false;
                                  }
                                });

                                if(load) {
                                  loadProducts.push(image);
                                }
                              });

                                // post them to db
                                try {
                                  promiseToPostItems(allProducts, req.db)
                                  .catch(console.error)
                                  .then(function() {

                                    let query = {
                                      type: "rainRadar",
                                      radarProduct: prod.toUpperCase(),
                                      $and: [
                                        {"timestamp": {"$gt": (firstTimestamp)}},
                                        {"timestamp": {"$lte": (lastTimestamp)}}
                                      ]
                                    };

                                    // get them from db
                                    try {
                                      promiseToGetItems(query, req.db)
                                      .catch(console.error)
                                      .then(function(result) {
                                        if(result.length > 0) {

                                          let answer = {
                                            "type": "previousRainRadar",
                                            "length": result.length,
                                            "radProd": prod
                                            //"radarImages": result
                                          };

                                          result.forEach(function(image) {
                                            answer[image.timestamp] = [image];
                                          });
                                          if (!res.headersSent) {
                                            res.json(answer);
                                          }
                                        }
                                        else {
                                          let e = "the requested timestamp lies in the past, with no matching historic data";
                                          console.log(e);
                                          if (!res.headersSent) {
                                            res.status(404).send(e);
                                          }
                                        }
                                      });
                                    } catch(e) {
                                      console.dir(e);
                                      if (!res.headersSent) {
                                        res.status(500).send(e);
                                      }
                                    }

                                  });
                                } catch(e) {
                                  console.dir(e);
                                  if (!res.headersSent) {
                                    res.status(500).send(e);
                                  }
                                }

                              }
                            });
                          }
                        });
                      }
                    });
                  }
                });
              }
              else {
                // return all found data
                let answer = {
                  "type": "previousRainRadar",
                  "length": result.length,
                  "radProd": prod
                  //"radarImages": result
                };

                result.forEach(function(image, index) {
                    answer[image.timestamp] = [image];
                });
                if (!res.headersSent) {
                  res.json(answer);
                }
              }
            }
            else {
              // TODO if not historic, return all
              //if results found
              if(result.length > 0) {
                // return all found data
                let answer = {
                  "type": "previousRainRadar",
                  "length": result.length,
                  "radProd": prod
                  //"radarImages": result
                };

                result.forEach(function(image, index) {
                  // return max 10 pics
                  if(index < 11) {
                    answer[image.timestamp] = [image];
                  }
                });
                if (!res.headersSent) {
                  res.json(answer);
                }

              }
              // if not demo and none found, send 404
              else {
                let e = "no results found for this timestamp.";
                if (!res.headersSent) {
                  res.status(404).send(e);
                }
              }
            }

          });
        }
  }
};


/**
*
* @author Paula Scharf, matr.: 450334
* @param
* @param
* @returns
*/
function promiseToGetTweetsForEvent(dwd_id, timestamp, db) {
  //
  return new Promise((resolve, reject) => {
    // JSON with the ID of the current event, needed for following database-check
    let query = {
      type: "Tweet",
      dwd_id: dwd_id,
      $and: [
        {"timestamp": {"$gte": ((timestamp - 299000) < 0) ? 0 : (timestamp - 299000)}},
        {"timestamp": {"$lte": (timestamp)}}
      ]
    };
    promiseToGetItems(query, db)
      .catch(function (error) {
        reject(error);
      })
      .then(function (result) {
        resolve(result);
      });
  });
}


/**
*
* @author Paula Scharf, matr.: 450334
* @param
* @returns
*/
function checkParams(params) {
  switch (params) {
    case (params.wtype !== "unwetter" && params.wtype !== "rainRadar"):
      return {
        err_message: "'wtype' (weather type) is neither 'unwetter' nor 'rainRadar'"
      };
    case (JSON.parse(params.currentTimestamp) < 0):
      return {
        err_message: "'currentTimestamp' is not a valid epoch timestamp (milliseconds)"
      };
    default:
      return {
        err_message: ""
      };
  }
}


router.route("/:wtype/:currentTimestamp").get(previousWeather);
router.route("*").get(function(req, res){
  res.status(404).send({err_msg: "Parameters are not valid"});
});

module.exports = router;
