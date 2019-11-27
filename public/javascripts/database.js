// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/



/**
* @desc
*
* @author Katharina Poppinga
*/
function removeOldUnwetterFromDB(){

  // alles ältere als die letzten 10 zeitschritte aus DB löschen

  // Zeitstempel in DB aktualisieren, falls Unwetter im neuen Request wieder vorkommt?


  // TODO: DELETE zu POST ändern?

/*
  $.ajax({
    // use a http POST request
    type: "POST",
    // URL to send the request to
    url: "/db/delete",
    // type of the data that is sent to the server
    contentType: "application/json; charset=utf-8",
    // data to send to the server, send as String for independence of server-side programming language
    data: JSON.stringify(iD),
    // timeout set to 10 seconds
    timeout: 10000
  })

  // if the request is done successfully, ...
  .done (function (response) {



    //
    //resolve(response);
  })


  // if the AJAX-request has failed, ...
  .fail (function (xhr, status, error) {

    // ... give a notice that the AJAX request for finding one item has failed and show the error on the console
    console.log("AJAX request (deleting one (???????) item) has failed.", error);

    // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
    //  if (error === "timeout") {
    //    JL("ajaxDeletingOneItemTimeout").fatalException("ajax: '/db/delete' timeout");
    //  }

    //reject("AJAX request (deleting one (???????) item) has failed.");

  });
*/

}
