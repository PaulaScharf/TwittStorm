// jshint esversion: 8
// jshint node: true
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/



/**
  * function to call raster API, saves to db
  * based on functionality in DWDUnwetterprocessing.js
  * @param product the rasterProduct as a string
  * @param classification the classification as a string, use "dwd" as default
  * @author Katharina Poppinga, Benjamin Rieke, Paula Scharf, Jonathan Bahlmann
  */
function saveRainRadar(product, classification) {
  let url = '/radar/' + product + '/' + classification;
  return new Promise((resolve, reject) => {
      // This array will contain all the calls of the function "promiseToPostItem"
      let arrayOfPromises = [];
      // load the GeoJSON from the DWD Geoserver and display the current Unwetter-areas
      $.getJSON(url, function (data) {
          // EPSG: 4326
          // an async call is necessary here to use the await-functionality
          (async () => {
            let radarJSON = {
              type: "rainradar",
              date: data.rasterMeta.date,
              product: data.rasterMeta.product,
              interval: data.rasterMeta.interval_minutes,
              classInformation: data.classBorders.classes,
              geometry: data.geometry
            };
            arrayOfPromises.push(promiseToPostItems([radarJSON], "rainradar"));

            try {
                // wait for all the posts to the database to succeed
                await Promise.all(arrayOfPromises);
                // return the promise to get all Items
                resolve(promiseToGetItems({type: "rainradar"}, "rainradar"));
            } catch(e) {
              reject("could not POST all Radar data");
            }
          })();
      });
  });
}
