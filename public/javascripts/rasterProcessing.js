// jshint esversion: 8
// jshint node: true
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
  * function to call raster API, saves to db
  * based on functionality in DWDUnwetterprocessing.js
  * @param product the rasterProduct as a string
  * @param classification the classification as a string, use "dwd" as default
  * @author Katharina Poppinga, Benjamin Rieke, Paula Scharf, Jonathan Bahlmann
  */
function saveRainRadar(product, classification) {
  let url = '/raster/' + product + '/' + classification;
  return new Promise((resolve, reject) => {
      // This array will contain all the calls of the function "promiseToPostItem"
      let arrayOfPromises = [];
      // load the GeoJSON from the DWD Geoserver and display the current Unwetter-areas
      $.getJSON(url, function (data) {
          // EPSG: 4326
          // an async call is necessary here to use the await-functionality
          (async () => {
            let radarJSON = {
              type: "RainRadar",
              date: data.rasterMeta.date,
              product: data.rasterMeta.product,
              interval: data.rasterMeta.interval_minutes,
              classInformation: data.classBorders.classes,
              geometry: data.geometry
            };
            arrayOfPromises.push(promiseToPostItem(radarJSON));

            try {
                // wait for all the posts to the database to succeed
                await Promise.all(arrayOfPromises);
                // return the promise to get all Items
                resolve(promiseToGetAllItems({type: "RainRadar"}));
            } catch(e) {
              reject("could not post all Radar data");
            }
          })();
      });
  });
}

/**
 * This function calls 'add' with AJAX, to save a given item in the database.
 * The logic is wrapped in a promise to make it possible to await it (see saveAndReturnNewUnwetterFromDWD for an example
 * of await)
 * @author Paula Scharf, matr.: 450334
 * @param {Object} item - the item to be posted
 */
function promiseToPostItem(item) {
    return new Promise((resolve, reject) => {
        $.ajax({
            // use a http POST request
            type: "POST",
            // URL to send the request to
            url: "db/add",
            // type of the data that is sent to the server
            contentType: "application/json; charset=utf-8",
            // data to send to the server
            data: JSON.stringify(item),
            // timeout set to 15 seconds
            timeout: 15000
        })

        // if the request is done successfully, ...
            .done(function (response) {
                // ... give a notice on the console that the AJAX request for pushing an encounter has succeeded
                console.log("AJAX request (posting an item) is done successfully.");
                resolve();
            })

            // if the request has failed, ...
            .fail(function (xhr, status, error) {
                // ... give a notice that the AJAX request for posting an encounter has failed and show the error on the console
                console.log("AJAX request (posting an item) has failed.", error);

                // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
                if (error === "timeout") {
                    //JL("ajaxCreatingEncounterTimeout").fatalException("ajax: 'add' timeout");
                }
                reject("AJAX request (posting an item) has failed.");
            });
    });
}

/**
 * This function calls '/db/' with AJAX, to retrieve all items that comply to the given query in the database.
 * The logic is wrapped in a promise to make it possible to await it (see saveAndReturnNewUnwetterFromDWD for an example
 * of await).
 * @author Paula Scharf, matr.: 450334
 * @param {Object} query
 * @example getAllItems({type: "Unwetter"})
 */
function promiseToGetAllItems(query) {
    return new Promise((resolve, reject) => {
        $.ajax({
            // use a http POST request
            type: "POST",
            // URL to send the request to
            url: "/db/",
            data: query,
            // timeout set to 15 seconds
            timeout: 20000
        })

        // if the request is done successfully, ...
            .done(function (response) {
                // ... give a notice on the console that the AJAX request for pushing an encounter has succeeded
                console.log("AJAX request (reading all items) is done successfully.");
                // "resolve" acts like "return" in this context
                resolve(response);
            })

            // if the request has failed, ...
            .fail(function (xhr, status, error) {
                // ... give a notice that the AJAX request for posting an encounter has failed and show the error on the console
                console.log("AJAX request (reading all items) has failed.", error);
                console.dir(error);

                // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
                if (error === "timeout") {
                    //JL("ajaxCreatingEncounterTimeout").fatalException("ajax: 'add' timeout");
                }
                reject("AJAX request (reading all items) has failed.");
            });

    });
}
