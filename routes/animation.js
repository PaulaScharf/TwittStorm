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

        let query = {
            "type": wtype,
            "timestamps": {
                "$elemMatch": {
                    "$lte": JSON.parse(currentTimestamp),
                    "$gte": (JSON.parse(currentTimestamp) - 50 * 60000)
                }
            }

        };
        promiseToGetItems(query, req.db)
            .catch(console.error)
            .then(function (response) {
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
            });
    }
};

function checkParams(params) {
    if (params.wtype !== "unwetter" && params.wtype !== "rainradar") {
        return {
            err_message: "'wtype' (weather type) is neither 'unwetter' nor 'rainradar'"
        };
    } else if (JSON.parse(params.currentTimestamp) < 0) {
        return {
            err_message: "'currenttimestamp' is not a valid epoch timestamp (milliseconds)"
        };
    }
    return {
        err_message: ""
    };
}

router.route("/:wtype/:currentTimestamp").get(previousWeather);

module.exports = router;