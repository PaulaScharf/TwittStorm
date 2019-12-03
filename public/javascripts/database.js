// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/


/**
* @desc First removes all timestamps of Array .......
* Afterwards, deletes .....
* ANPASSEN
* alles ältere als die letzten 10 zeitschritte aus DB löschen
*
* @author Katharina Poppinga
* @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
*/
function removeOldUnwetterFromDB(currentTimestamp){

  // TODO: überprüfen, ob < oder > oder = passt (serverseitig)

  // 10 timesteps = 50 minutes = 3000000 milliseconds
  let timestampDeleting = currentTimestamp - 3000000;

  let timestampQuery = {
    timestampDeleting: timestampDeleting
  };


  // array-update: alle timestamps aus array in DB löschen, die älter als timestampDeleting sind
  $.ajax({
    // use a http PUT request
    type: "PUT",
    // URL to send the request to
    url: "/db/removeUnwetterTimestamps",
    // type of the data that is sent to the server
    contentType: "application/json; charset=utf-8",
    // data to send to the server, send as String for independence of server-side programming language
    data: JSON.stringify(timestampQuery),
    // timeout set to 10 seconds
    timeout: 10000
  })

  // if the request is done successfully, ...
  .done (function (response) {

    //
    removeOldUnwetterFromDB2();
  })


  // if the AJAX-request has failed, ...
  .fail (function (xhr, status, error) {

    // ... give a notice that the AJAX request for ............ has failed and show the error on the console
    console.log("AJAX request (........) has failed.", error);

    // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
    if (error === "timeout") {
      //    JL("ajax........Timeout").fatalException("ajax: '/db/removeUnwetterTimestamps' timeout");
    }
  });
}



/**
* @desc Deletes .....
* ANPASSEN
*
* @author Katharina Poppinga
*/
function removeOldUnwetterFromDB2(){

  // alle Unwetter aus DB löschen, deren timestamp-array nun leer ist:

  $.ajax({
    // use a http DELETE request
    type: "DELETE",
    // URL to send the request to
    url: "/db/deleteOldUnwetter",
    // type of the data that is sent to the server
    contentType: "application/json; charset=utf-8",
    // data to send to the server, send as String for independence of server-side programming language
    data: JSON.stringify(),
    // timeout set to 10 seconds
    timeout: 10000
  })

  // if the request is done successfully, ...
  .done (function (response) {

  })


  // if the AJAX-request has failed, ...
  .fail (function (xhr, status, error) {

    // ... give a notice that the AJAX request for finding one item has failed and show the error on the console
    console.log("AJAX request (deleting one (???????) item) has failed.", error);

    // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
    if (error === "timeout") {
      //    JL("ajaxDeletingOneItemTimeout").fatalException("ajax: '/db/deleteOldUnwetter' timeout");
    }
  });
}
