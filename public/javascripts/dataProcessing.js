// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/



/**
* This function calls '/db/' with AJAX, to retrieve all items that comply to the given query in the database.
* The logic is wrapped in a promise to make it possible to await it (see processUnwetterFromDWD for an example of await).
* @author Paula Scharf, matr.: 450334
* @param {Object} query
* @param {String} typeOfItems - for documentation
* @example promiseToGetItems({type: "Unwetter"})
*/
function promiseToGetItems(query, typeOfItems) {

  return new Promise((resolve, reject) => {
    $.ajax({
      // use a http POST request
      type: "POST",
      // URL to send the request to
      url: "/data/",
      //
      data: query,
      // timeout set to 20 seconds
      timeout: 20000
    })

    // if the request is done successfully, ...
    .done(function (response) {
      // ... give a notice on the console that the AJAX request for reading all items has succeeded
      console.log("AJAX request (reading " + typeOfItems + ") is done successfully.");
      // "resolve" acts like "return" in this context
      resolve(response);
    })

    // if the request has failed, ...
    .fail(function (xhr, status, error) {
      // ... give a notice that the AJAX request for for reading all items has failed and show the error on the console
      console.log("AJAX request (reading " + typeOfItems + ") has failed.", error);

      // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
      if (error === "timeout") {
        //JL("ajaxReadingAllItemsTimeout").fatalException("ajax: '/data' timeout");
      }

      reject("AJAX request (reading " + typeOfItems + ") has failed.");
    });
  });
}


/**
* This function calls '/db/add' with AJAX, to save the given items in the database.* The logic is wrapped in a promise to make it possible to await it (see processUnwetterFromDWD for an example of await)
* @author Paula Scharf
* @param arrayOfItems - array which contains the items
* @param {String} typeOfItems - for documentation
*/
function promiseToPostItems(arrayOfItems, typeOfItems) {

  return new Promise((resolve, reject) => {

    if (arrayOfItems.length === 0) {
      resolve();
    }

    $.ajax({
      // use a http POST request
      type: "POST",
      // URL to send the request to
      url: "/data/add",
      // type of the data that is sent to the server
      contentType: "application/json; charset=utf-8",
      // data to send to the server
      data: JSON.stringify(arrayOfItems),
      // timeout set to 15 seconds
      timeout: 15000
    })

    // if the request is done successfully, ...
    .done(function () {
      // ... give a notice on the console that the AJAX request for inserting many items has succeeded
      console.log("AJAX request (inserting many " + typeOfItems + ") is done successfully.");
      resolve();
    })

    // if the request has failed, ...
    .fail(function (xhr, status, error) {
      // ... give a notice that the AJAX request for inserting many items has failed and show the error on the console
      console.log("AJAX request (inserting many " + typeOfItems + ") has failed.", error);

      // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
      if (error === "timeout") {
        //JL("ajaxInsertingManyItemsTimeout").fatalException("ajax: '/data/add' timeout");
      }

      reject("AJAX request (inserting many " + typeOfItems + ") has failed.");
    });
  });
}
