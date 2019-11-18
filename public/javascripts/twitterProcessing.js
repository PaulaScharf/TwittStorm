// jshint esversion: 6
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/



function saveAndReturnNewTweetsThroughSearch() {
  return new Promise((resolve, reject) => {
    // this array will contain all the calls of the function "promiseToPostItem"
    let arrayOfPromises = [];
    $.ajax({
      // use a http GET request
      type: "GET",
      // URL to send the request to
      url: "/twitter/search",
      // data type of the response
      dataType: "json",
      // timeout set to 20 seconds
      timeout: 30000
    })

    // if the request is done successfully, ...
    .done(function (response) {
      (async () => {
        for (let i = response.statuses.length - 1; i >= 0; i--) {
          let currentFeature = response.statuses[i];
          let currentStatus = {
            type: "Tweet",
            id: currentFeature.id,
            statusmessage: currentFeature.text,
            author: {
              id: currentFeature.user.id,
              name: currentFeature.user.name,
              location_home: currentFeature.user.location
            },
            timestamp: currentFeature.created_at,
            location_actual: currentFeature.coordinates,
            unwetter: ""
          };
          arrayOfPromises.push(promiseToPostItem(currentStatus));
        }
        try {
          // wait for all the posts to the database to succeed
          await Promise.all(arrayOfPromises);
          // return the promise to get all Items
          resolve(promiseToGetAllItems({type: "Tweet"}));
          // ... give a notice on the console that the AJAX request for reading all routes has succeeded
          console.log("AJAX request (reading all tweets) is done successfully.");
          // if await Promise.all(arrayOfPromises) fails:
        } catch (e) {
          reject("couldnt post all tweets")
        }
      })();
    })

    // if the request has failed, ...
    .fail(function (xhr, status, error) {
      // ... give a notice that the AJAX request for reading all routes has failed and show the error on the console
      console.log("AJAX request (reading all tweets) has failed.", error);

      // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
      if (error === "timeout") {
        //JL("ajaxReadingAllRoutesTimeout").fatalException("ajax: '/routes/readAll' timeout");
      }
    });
  });
}
