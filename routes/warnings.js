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
const https = require("https");

// import functions that are declared within other routes-files
const {promiseToGetItems, promiseToPostItems, promiseToUpdateItems, promiseToDeleteItems} = require('./dataPromisesHelpers.js');
const updateVariableInConfigYaml = require('./configuration.js').updateVariableInConfigYaml;

// yaml configuration
const fs = require('fs');
const yaml = require('js-yaml');
let config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));


/**
*
* @author Paula Scharf
* @param req
* @param res
* @param next
* @returns {*}
*/
const getWarningsForTime = function(req, res, next) {
  let validParams = checkParamsWarnings(req.params);

  if (validParams.err_msg !== "") {
    if (!res.headersSent) {
      res.status(422).send(validParams);
    }
  } else {
    config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));
    try {
      // timestamp (in Epoch milliseconds) for this whole specific request
      let currentTimestamp = JSON.parse(req.params.timestamp);

      // 1. case: use demodata, do not send request to DWD:
      if ((currentTimestamp >= config.demo.timestamp_start && currentTimestamp <= config.demo.timestamp_end)) {
        proccessUnwettersFromLocal(currentTimestamp, req.db)
        .then(function (response) {

          updateVariableInConfigYaml("timestamp_last_warnings_request", currentTimestamp);

          response = {
            type: "SevereWeatherWarnings",
            events: response
          };
          if (!res.headersSent) {
            res.send(response);
          }

        }, function (error) {
          error.httpStatusCode = 500;
          return next(error);
        })
        .catch(function (error) {
          error.httpStatusCode = 500;
          return next(error);
        });

        // 2. case: do not use demodata:
      } else {
        // if last request to DWD is more than or exactly 'refresh-rate'-ago, send request to DWD for current warnings and save them in database
        if (config.timestamp_last_warnings_request ? ((currentTimestamp - config.timestamp_last_warnings_request) >= config.refresh_rate) : true) {

          let timestampDeleting = currentTimestamp - (config.refresh_rate * 11);

          // $lt means <, $lte means <=
          promiseToUpdateItems({type: "unwetter", timestamps: {"$all": [{"$and": [
            {"$gt": config.demo.timestamp_end},
            {"$lt": config.demo.timestamp_start}
          ]}]}}, {"$pull": {"timestamps": {"$lte": timestampDeleting}}},
          req.db)
          .then(function () {
            // get those warnings out of database whose timestamp-array is empty
            promiseToGetItems({"$and": [{"type": "unwetter"}, {"timestamps": {"$size": 0}}]}, req.db)
            .then(function (response) {

              let oldUnwetterIDs = [];
              // put together all JSON-objects of old warning dwd_ids in one array
              for (let u = 0; u < response.length; u++) {
                oldUnwetterIDs.push({"dwd_id": response[u].dwd_id});
              }
              // if there are old warnings existing (with empty timestamp-array), delete them and their corresponding tweets:
              if (oldUnwetterIDs.length > 0) {

                promiseToDeleteItems({$and: [ {"$or": [{"type": "unwetter"}, {"type": "tweet"}] }, {"$or": oldUnwetterIDs}]}, req.db)
                .then(function () {
                },
                function (error) {
                  error.httpStatusCode = 500;
                  return next(error);
                })
                .catch(function (error) {
                  error.httpStatusCode = 500;
                  return next(error);
                });
              }
            }, function (error) {
              error.httpStatusCode = 500;
              return next(error);
            })
            .catch(function (error) {
              error.httpStatusCode = 500;
              return next(error);
            });
          }, function (error) {
            error.httpStatusCode = 500;
            return next(error);
          })
          .catch(function (error) {
            error.httpStatusCode = 500;
            return next(error);
          });

          // ".then" is used here, to ensure that the .......... has finished and a result is available
          // saves new requested warnings in database
          processUnwettersFromDWD(currentTimestamp, req.db)
          .then(function () {

            updateVariableInConfigYaml("timestamp_last_warnings_request", currentTimestamp);
            getWarningsFromDB(currentTimestamp, req.db, res, next);

          }, function (error) {
            error.httpStatusCode = 500;
            return next(error);
          })
          .catch(function (error) {
            error.httpStatusCode = 500;
            return next(error);
          });

          // do not send request to DWD, because last request to DWD is less than refresh-rate ago
          // therefore use last requested and already stored warnings
        } else {
          getWarningsFromDB(currentTimestamp, req.db, res, next);
        }
      }
    } catch (error) {
      error.httpStatusCode = 500;
      return next(error);
    }
  }
};


/**
* @desc This function retrieves the current warnings-polygons from the local instance of the server and
* then posts all polygons to the database.
* @author Paula Scharf
* @param {number} currentTimestamp - timestamp in Epoch milliseconds
* @param db - database reference
*/
function proccessUnwettersFromLocal(currentTimestamp, db) {

  return new Promise((resolve, reject) => {
    let query = {
      type: "unwetter",
      "timestamps": {
        "$elemMatch": {
          "$lte": JSON.parse(currentTimestamp),
          "$gte": JSON.parse(currentTimestamp - 299000)
        }
      }
    };

    //
    promiseToGetItems(query, db)
    .then(function(response) {
      if (typeof response !== "undefined" && response.length > 0) {
        resolve(response);
      } else {
        fs.readFile( './demo/warnings.txt', 'utf8', function (err, data) {
          if (err) {
            throw err;
          }
          // success!
          var arrayOfItems = JSON.parse(data);
          promiseToPostItems(arrayOfItems, db)
          .then(function () {
            let outputArray = [];
            arrayOfItems.forEach(function (item) {
              let isRecent = false;
              item.timestamps.forEach(function (timestamp) {
                if(timestamp>=(currentTimestamp - 299000) && timestamp<=(currentTimestamp)) {
                  isRecent = true;
                }
              });
              if (isRecent) {
                outputArray.push(item);
              }
            });
            resolve(outputArray);
          })
          .catch(function (error) {
            reject(error);
          });
        });
      }})
      .catch(function (error) {
        reject(error);
      });
    });
  }


  /**
  * @desc This function retrieves the current severe warnings from the DWD and
  * checks whether they are already stored in database from a former request.
  * NOCH ANPASSEN!!
  *
  * then posts all polygons to the database.
  *
  * @author Paula Scharf, Katharina Poppinga
  * @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
  * @param db
  */
  function processUnwettersFromDWD(currentTimestamp, db) {

    return new Promise((resolve, reject) => {

      let arrayOfGroupedUnwetters = [];
      let endpoint = config.dwd.warnings;

      // define options for the following https-GET request
      const options = {
        // timeout set to 20 seconds
        timeout: 20000
      };

      https.get(endpoint, options, (httpResponse) => {
        var body = "";
        httpResponse.on('data', (chunk) => {
          body += chunk;
        });
        httpResponse.on("end", async () => {

          try {
            let allData = JSON.parse(body);
            let neededFeatures = [];

            // just take those features that are rain, snowfall, thunderstorm or blackice events:
            allData.features.forEach(function (item){

              let ii = item.properties.EC_II;
              // if the item is a:
              // rain ((ii >= 61) && (ii <= 66)),
              // snowfall ((ii >= 70) && (ii <= 78)),
              // thunderstorm (((ii >= 31) && (ii <= 49)) || ((ii >= 90) && (ii <= 96)))
              // or blackice event ((ii === 24) || ((ii >= 84) && (ii <= 87)))
              // than save it in neededFeatures-Array
              if ( ((ii >= 61) && (ii <= 66)) || ((ii >= 70) && (ii <= 78)) || (((ii >= 31) && (ii <= 49)) || ((ii >= 90) && (ii <= 96))) || ((ii === 24) || ((ii >= 84) && (ii <= 87))) ){
                neededFeatures.push(item);
              }
            });

            let data = {
              "type": "FeatureCollection",
              "features": neededFeatures
            };

            // ***** formatting the warning which will be inserted into the database afterwards: *****
            //
            let groupedData = groupByArray(data.features, 'id');

            //
            groupedData.forEach(function (item){
              let currentUnwetter = JSON.parse(JSON.stringify(item.values[0]));
              currentUnwetter.geometry = [];

              //
              for (let i = 0; i < item.values.length; i++) {
                currentUnwetter.geometry.push(item.values[i].geometry);
              }
              //
              arrayOfGroupedUnwetters.push(currentUnwetter);
            });

            let processingUnwetters = [];
            //
            for (let i = arrayOfGroupedUnwetters.length - 1; i >= 0; i--) {

              let currentFeature = arrayOfGroupedUnwetters[i];

              // timestamps are given by DWD as UTC

              // ONSET is the timestamp that gives the time when the warning begins - it is NOT the timestamp for the moment when the warning was published
              // make an Epoch-milliseconds-timestamp (out of the ONSET-timestamp given by the DWD)
              let onset = Date.parse(currentFeature.properties.ONSET);

              // EXPIRES is the timestamp that gives the time when the warning ends
              // make an Epoch-milliseconds-timestamp (out of the EXPIRES-timestamp given by the DWD)
              let expires = Date.parse(currentFeature.properties.EXPIRES);

              // use only the notifications that are actual reports and not just tests
              if ((currentFeature.properties.STATUS === "Actual") && (onset <= currentTimestamp) && (expires >= currentTimestamp)) {

                // check whether exactly this warning is already stored in the database
                // and, depending on its MSGTYPE (Alert, Update, Cancel), add, update or delete if to/from database
                processingUnwetters.push(checkDBForExistingUnwetter(currentFeature, arrayOfGroupedUnwetters, currentTimestamp, db));
              }
            }
            await Promise.all(processingUnwetters);
            resolve();
            // if an error occurs in parsing and sending the body ...
          } catch(error) {
            reject(error);
          }
        });

        // if an error occurs during the get-request, give a notice, that the request has failed and show the error on the console
      }).on('error', (error) => {
        console.log("Failure while retrieving unwetters.", error);
      });
    });
  }


  /**
  * @desc Checks whether a given severe weather warning is already stored in
  * database (checks it with the help of the dwd_id) and ............
  *
  * @author Katharina Poppinga, Paula Scharf
  * @private
  * @param {Object} currentFeature - JSON of one specific warning taken from DWD response
  * @param {Array} arrayOfGroupedUnwetters -
  * @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
  * @param db - database
  */
  function checkDBForExistingUnwetter(currentFeature, arrayOfGroupedUnwetters, currentTimestamp, db){

    return new Promise((resolve, reject) => {
      // JSON with the ID of the current warning, needed for following database-check
      let query = {
        type: "unwetter",
        dwd_id: currentFeature.properties.IDENTIFIER
      };

      //
      promiseToGetItems(query, db)
      .then(function(response) {

        // response[0] contains the one and only warning that was read out of database with promiseToGetItems

        // if the current warning (with given dwd_id) ALREADY EXISTS in the database ...
        if (typeof response !== "undefined" && response.length > 0) {
          // ... do not insert it again but:
          // if the message (MSGTYPE) is an "Update", the dwd_id will be a new one, see: https://www.dwd.de/DE/leistungen/opendata/help/warnungen/cap_dwd_implementation_notes_de_pdf.pdf?__blob=publicationFile&v=4
          // if its MSGTYPE is "Alert" or "Update"
          if ((currentFeature.properties.MSGTYPE === "Alert") || (currentFeature.properties.MSGTYPE === "Update")) {

            // response[0]._id is the warning-item-ID from mongoDB
            // if the array "timestamps" does not already contain the currentTimestamp, append it now:
            if (!(response[0].timestamps.includes(currentTimestamp))) {
              promiseToUpdateItems({_id: response[0]._id}, {"$push": {"timestamps": currentTimestamp}}, db)
              .then(function(response) {
                resolve();
              })
              .catch(function(error) {
                reject(error);
              });
            }

            // if its MSGTYPE is "Cancel", than delete this warning from database because it was a mistake
          } else {
            promiseToDeleteItems({$and: [{"$or": [{"type": "unwetter"}, {"type": "tweet"}]}, {"dwd_id": response[0].dwd_id}]}, db)
            .then(function () {
            },
            function (error) {
              error.httpStatusCode = 500;
              return next(error);
            })
            .catch(function (error) {
              error.httpStatusCode = 500;
              return next(error);
            });
          }

          // if this warning does NOT EXIST in the database ...
        } else {
          // ... and if its MSGTYPE is "Alert" or "Update" ...
          if ((currentFeature.properties.MSGTYPE === "Alert") || (currentFeature.properties.MSGTYPE === "Update")) {

            // ... insert it by first formatting the warnings' JSON and ...
            let currentUnwetter = createUnwetterForDB(currentFeature, currentTimestamp);
            // ... add it to the arrayOfGroupedUnwetters
            // this array will be used for subsequent processing before adding the warning to the
            // Promise (in function processUnwetterFromDWD) for inserting all new warnings into database
            promiseToPostItems([currentUnwetter],db)
            .then(function(response) {
              resolve();
            })
            .catch(function(error) {
              reject(error);
            });
          }

          // if the warning does NOT EXIST in the database and its MSGTYPE is "Cancel", do nothing with this warning
        }
      })
      .catch(function(error) {
        reject(error);
      });
    });
  }


  /**
  * @desc
  *
  * timestamps will be inserted in Epoch milliseconds (UTC)
  *
  *
  * @author Paula Scharf, Katharina Poppinga
  * @param {Object} currentFeature -
  * @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
  */
  function createUnwetterForDB(currentFeature, currentTimestamp){

    // this array saves all timestamps of those DWD requests, in which this specific warning was given in the response
    let timestamps = [currentTimestamp];

    // convert the DWD-timestamps to Epoch milliseconds (UTC)
    let sent = Date.parse(currentFeature.properties.SENT);
    let onset = Date.parse(currentFeature.properties.ONSET);
    let effective = Date.parse(currentFeature.properties.EFFECTIVE);
    let expires = Date.parse(currentFeature.properties.EXPIRES);

    return {
      type: "unwetter",
      dwd_id: currentFeature.properties.IDENTIFIER,
      timestamps: timestamps,
      geometry: currentFeature.geometry,
      properties: {
        event: currentFeature.properties.EVENT,
        ec_ii: currentFeature.properties.EC_II,
        certainty: currentFeature.properties.CERTAINTY, // "Observed" or "Likely"(p > ~50%)
        description: currentFeature.properties.DESCRIPTION,
        instruction: currentFeature.properties.INSTRUCTION,
        sent: sent,
        onset: onset,
        effective: effective,
        expires: expires
      }
    };
  }


  /**
  * Retrieves severe weather warnings from the given database. For the warnings applies:
  * The parameter "onset" has to be bigger the the given currentTimestamp and the parameter "expires" has to be smaller.
  * @author Paula Scharf, Katharina Poppinga
  * @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
  * @param db - database
  * @param res -
  * @param next -
  */
  function getWarningsFromDB(currentTimestamp, db, res, next) {

    // JSON with the query for getting only all current warnings out of database
    let query = {
      "type": "unwetter",
      "properties.onset": {"$lt": JSON.parse(currentTimestamp)},
      "properties.expires": {"$gt":  JSON.parse(currentTimestamp)}
    };

    promiseToGetItems(query, db)
    .then(function (response) {
      response = {
        type: "SevereWeatherWarnings",
        events: response
      };
      if(!res.headersSent) {
        res.send(response);
      }
    })
    .catch(function (error) {
      error.httpStatusCode = 500;
      return next(error);
    });
  }


  /**
  * @desc Groups an array of objects by a given key (attribute)
  * @param xs - array which is to be grouped
  * @param key - attribute by which the objects are grouped
  * @returns {Array} - An array in which all the grouped objects are separate (sub-)arrays
  * @author https://stackoverflow.com/questions/14446511/most-efficient-method-to-groupby-on-an-array-of-objects#comment64856953_34890276
  */
  function groupByArray(xs, key) {
    return xs.reduce(function (rv, x) {
      let v = key instanceof Function ? key(x) : x[key];
      let el = rv.find((r) => r && r.key === v);
      if (el) {
        el.values.push(x);
      } else {
        rv.push({key: v, values: [x]});
      }
      return rv;
    }, []);
  }

/**
 * Verifies the parameters given to the "/warnings" route.
 * @author Paula Scharf
 * @param params {object} - contains all the parameters given to the "/warnings" route
 */
function checkParamsWarnings(params) {
    try {
      if (JSON.parse(params.timestamp) > 0) {
        return {
          err_msg: ""
        };
      } else {
        return {
          err_msg: "'timestamp' is not a valid epoch timestamp"
        };
      }
    } catch {
      return {
        err_msg: "'timestamp' is not a valid epoch timestamp"
      };
    }
  }


  router.route("/:timestamp").get(getWarningsForTime);

  module.exports = router;
