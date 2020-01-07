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

const {promiseToGetItems} = require('./dataPromisesHelpers.js');

// yaml configuration
const fs = require('fs');
const yaml = require('js-yaml');
var config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));


/**
 * This retrieves weather events from the past 50 minutes and gives the to the result object.
 * @param req - request
 * @param res - result
 */
var previousWeather = function(req, res) {

    let validParams = checkParams(req.params);

    if (validParams.err_message !== "") {
        res.status(422).send(validParams);
    } else {

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
                res.status(500).send({err_msg: error});
            })
            .then(function (response) {
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
                        })
                    });
                    // if the response includes more than 10 timestamp only choose the 10 most recent ones
                    if (arrayOfTimestamps.length > 10) {
                        arrayOfTimestamps.sort(function (a, b) {
                            return a - b
                        });
                        arrayOfTimestamps = arrayOfTimestamps.slice(0, 9);
                    }
                    arrayOfTimestamps.forEach(function (timestamp) {
                        if (!weatherEvents[timestamp]) {
                            weatherEvents[timestamp] = [];
                        }
                        response.forEach(function (event) {
                            if (event.timestamps.includes(timestamp) &&
                            (event.properties.onset) ? true : (event.properties.onset <= timestamp) &&
                            (event.properties.expires) ? true : (event.properties.expires > timestamp)) {
                                weatherEvents[timestamp].push(event);
                            }
                        });
                    });

                    res.json(weatherEvents);
                } catch(error) {
                    res.status(500).send({err_msg: error});
                }
            });
          }
          if(wtype == "rainRadar") {

            let query = {
                "type": wtype
            };
            promiseToGetItems(query, req.db)
            .catch(function(error) {
                res.status(500).send({err_msg: error});
            })
            .then(function(result) {

              let lastTimestamp = result[result.length - 1].timestamp;
              // 10 timesteps in the past
              let firstTimestamp = lastTimestamp - 10 * config.refresh_rate;

              console.log("searching between " + new Date(firstTimestamp) + " and " + new Date(lastTimestamp));

              let query = {
                "type": wtype,
                $and: [
                  {"timestamp": {"$gt": (firstTimestamp)}},
                  {"timestamp": {"$lte": (lastTimestamp)}}
                ]
              };

              promiseToGetItems(query, req.db)
              .catch(function(error) {
                  res.status(500).send({err_msg: error});
              })
              .then(function(result) {

              let radarImages = [];

              result.forEach(function(image) {
                  radarImages.push(image);
              });

              let answer = {
                "type": "previousRainRadar",
                "radarImages": radarImages
              };

              res.json(answer);

              });

            });
          }
    }
};

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

var previousRadar = function(req, res) {

  promiseToGetItems(query, req.db)
  .catch(function(error) {
      res.status(500).send({err_msg: error});
  })
  .then(function(result) {
    let radarImages = [];
    result.forEach(function(image) {
        radarImages.push(image.date);
    });
    let answer = {
      "type": "previousRainRadar",
      "radarImages": radarImages
    };
    res.json(answer);

  });

};

router.route("/radar/:timestamp").get(previousRadar);

module.exports = router;
