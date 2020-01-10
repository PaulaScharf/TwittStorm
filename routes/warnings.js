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
const updateCurrentTimestampInConfigYaml = require('./configuration.js').updateCurrentTimestampInConfigYaml;

// yaml configuration
const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));


/**
*
* @author Paula Scharf
* @param req
* @param res
* @param next
* @returns {*}
*/
const getWarningsForTime = function(req, res, next) {
  try {
    // timestamp (in Epoch milliseconds) for this whole specific request
    let currentTimestamp = JSON.parse(req.params.timestamp);

    // TODO: überprüfen, ob < oder > oder = passt (serverseitig)

    if (config.timestamp_last_warnings_request ? ((currentTimestamp - config.timestamp_last_warnings_request) >= config.refresh_rate) : true) {

      // timestampDeleting = currentTimestamp - 10 timesteps
      let timestampDeleting = currentTimestamp - (config.refresh_rate * 10);

      promiseToUpdateItems({type: "unwetter"}, {"$pull": {"timestamps": {"$lt": timestampDeleting}}},
        req.db)
        .then(function () {
          promiseToGetItems({"$and": [{"type": "unwetter"}, {"timestamps": {"$size": 0}}]}, req.db)
            .then(function (response) {
              let oldUnwetterIDs = [];
              // put together all JSON-objects of old Unwetter dwd_ids in one array
              for (let u = 0; u < response.length; u++) {
                oldUnwetterIDs.push({"dwd_id": response[u].dwd_id});
              }
              // if there are old Unwetter existing (older than 10 timesteps),
              // delete them and their corresponding tweets
              if (oldUnwetterIDs.length > 0) {
                promiseToDeleteItems({$and: [{"$or": [{"type": "unwetter"}, {"type": "tweet"}]}, {"$or": oldUnwetterIDs}]}, req.db)
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
      // saves new requested Unwetter in database
      processUnwettersFromDWD(currentTimestamp, req.db)
        .then(function () {

          updateCurrentTimestampInConfigYaml(currentTimestamp);

          // TODO: hier nicht als promise nötig??
          getWarningsFromDB(currentTimestamp, req.db, res, next);


        }, function (error) {
          error.httpStatusCode = 500;
          return next(error);
        })
        .catch(function (error) {
          error.httpStatusCode = 500;
          return next(error);
        });
    } else {
      // TODO: hier nicht als promise nötig??
      getWarningsFromDB(currentTimestamp, req.db, res, next);
    }
  } catch (error) {
    error.httpStatusCode = 500;
    return next(error);
  }
};


/**
* @desc This function retrieves the current Unwetter-Polygons from the DWD and
* NOCH ANPASSEN!!
*
* then posts all polygons to the database.
*
* @author Paula Scharf, Katharina Poppinga
* @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
* @param db
*/
function processUnwettersFromDWD(currentTimestamp, db) {
  //
  return new Promise((resolve, reject) => {
    //
    let arrayOfGroupedUnwetters = [];

    let endpoint = config.dwd.warnings;

    // define options for the following https-GET request
    const options = {
      // set the headers for the get-request
      headers: {
      },
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
          let data = JSON.parse(body);

          // ***** formatting the Unwetter which will be inserted into the database afterwards: *****
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

            // ONSET is the timestamp that gives the time when the Unwetter-warning begins - it is NOT the timestamp for the moment when the warning was published
            // make an Epoch-milliseconds-timestamp (out of the ONSET-timestamp given by the DWD)
            let onset = Date.parse(currentFeature.properties.ONSET);

            // EXPIRES is the timestamp that gives the time when the Unwetter-warning ends
            // make an Epoch-milliseconds-timestamp (out of the EXPIRES-timestamp given by the DWD)
            let expires = Date.parse(currentFeature.properties.EXPIRES);

            // use only the notifications that are actual reports and not just tests
            if ((currentFeature.properties.STATUS === "Actual") && (onset <= currentTimestamp) && (expires >= currentTimestamp)) {

              // check whether exactly this Unwetter is already stored in the database
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

      // if an error occurs while getting the animal tracking api ...
    }).on('error', (error) => {
      // ... give a notice, that the API request has failed and show the error on the console
      console.log("Failure while retrieving unwetters.", error);
    });
  });
}


/**
* @desc
*
* @author Katharina Poppinga, Paula Scharf
* @private
* @param {Object} currentFeature - JSON of one specific Unwetter taken from DWD response
* @param {Array} arrayOfGroupedUnwetters -
* @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
* @param db - database
*/
function checkDBForExistingUnwetter(currentFeature, arrayOfGroupedUnwetters, currentTimestamp, db){

  // TODO: auch auf einzelne vorhandene geometrys überprüfen
  //
  return new Promise((resolve, reject) => {
    // JSON with the ID of the current Unwetter, needed for following database-check
    let query = {
      type: "unwetter",
      dwd_id: currentFeature.properties.IDENTIFIER
    };

    //
    promiseToGetItems(query, db)
    .then(function(response) {

      // response[0] contains the one and only Unwetter that was read out of database with promiseToGetItems

      // if the current Unwetter (with given dwd_id) ALREADY EXISTS in the database ...
      if (typeof response !== "undefined" && response.length > 0) {

        // ... do not insert it again but:

        // TODO: FOLGEND IST ES DAVON ABHÄNGIG, OB EINE UPDATE MELDUNG EINE NEUE ODER DIE GLEICHE DWD_ID HAT WIE DIE ZUGEHÖRIGE ALERT MELDUNG!!!!!!!!!! (ÜBERPRÜFEN)
        // ERSTMAL WIRD HIER DAVON AUSGEGANGEN, DASS DIE DWD_IDS DANN UNTERSCHIEDLICH SIND, siehe https://www.dwd.de/DE/leistungen/opendata/help/warnungen/cap_dwd_implementation_notes_de_pdf.pdf?__blob=publicationFile&v=4

        // ... and if its MSGTYPE is "Alert" or "Update" ...
        if ((currentFeature.properties.MSGTYPE === "Alert") || (currentFeature.properties.MSGTYPE === "Update")) {

          // response._id is the Unwetter-item-ID from mongoDB
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

          // ... and if its MSGTYPE is "Cancel" ...
        } else {

          // TODO: delete this Unwetter from database?? (rückwirkend, da Meldung ein Irrtum ist??)
        }

        // if this Unwetter does NOT EXIST in the database ...
      } else {
        // ... and if its MSGTYPE is "Alert" or "Update" ...
        if ((currentFeature.properties.MSGTYPE === "Alert") || (currentFeature.properties.MSGTYPE === "Update")) {

          // ... insert it by first formatting the Unwetters JSON and ...
          let currentUnwetter = createUnwetterForDB(currentFeature, currentTimestamp);
          // ... add it to the arrayOfGroupedUnwetters
          // this array will be used for subsequent processing before adding the Unwetter to the
          // Promise (in function processUnwetterFromDWD) for inserting all new Unwetter into database

          promiseToPostItems([currentUnwetter],db)
          .then(function(response) {
            resolve();
          })
          .catch(function(error) {
            reject(error);
          });
        }

        // if the Unwetter does NOT EXIST in the database and its MSGTYPE is "Cancel", do nothing with this Unwetter
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

  // FÜR ALLE TIMESTAMPS JEDEN REQUESTS (siehe Zettel mit Paula, Jonathan)
  let timestamps = [currentTimestamp];

  // convert the DWD-timestamps to Epoch milliseconds (UTC)
  let sent = Date.parse(currentFeature.properties.SENT);
  let onset = Date.parse(currentFeature.properties.ONSET);
  let effective = Date.parse(currentFeature.properties.EFFECTIVE);
  let expires = Date.parse(currentFeature.properties.EXPIRES);

  //
  return {
    type: "unwetter",
    dwd_id: currentFeature.properties.IDENTIFIER,
    timestamps: timestamps,
    geometry: currentFeature.geometry,
    properties: {
      // TODO: am Ende überprüfen, ob alle Attribute hier benötigt werden, ansonsten unbenötigte löschen
      event: currentFeature.properties.EVENT,
      ec_ii: currentFeature.properties.EC_II,
      responseType: currentFeature.properties.RESPONSETYPE,
      urgency: currentFeature.properties.URGENCY,
      severity: currentFeature.properties.SEVERITY,
      certainty: currentFeature.properties.CERTAINTY,
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
* @desc .
*
* @author Paula Scharf, Katharina Poppinga
* @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
* @param db - database
* @param res -
* @param next -
*/
function getWarningsFromDB(currentTimestamp, db, res, next) {

  // JSON with the query for getting only all current Unwetter out of database
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

  // TODO: wozu gehört dieses catch?
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



router.route("/:timestamp").get(getWarningsForTime);

module.exports = router;
