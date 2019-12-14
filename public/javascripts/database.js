// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/


/**
* @desc First, for all Unwetter in database, respectively removes all timestamps of Array "timestamps" that
* are older than 50 minutes.
* Afterwards, deletes those Unwetter which then have an empty Array "timestamps".
* TODO: AUCH ZUGEHÖRIGE TWEETS-LÖSCHUNG!!
*
* @author Katharina Poppinga
* @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
*/
function removeOldUnwetterFromDB(currentTimestamp){

  // TODO: überprüfen, ob < oder > oder = passt (serverseitig)

  // 10 timesteps = 50 minutes = 3000000 milliseconds
  let timestampDeleting = currentTimestamp - paramArray.config.max_difference_timestamp;

  let timestampQuery = {
    query: {
      type: "Unwetter"
    },
    update: {
      "$pull": '{"timestamps": { "$lt": ' + timestampDeleting + ' }}'
    }
  };


  // array-update for all DB-items with type "Unwetter" do: for each array "timestamps" remove all timestamps that are older than timestampDeleting
  $.ajax({
    // use a http PUT request
    type: "PUT",
    // URL to send the request to
    url: "/db/update",
    // type of the data that is sent to the server
    contentType: "application/json; charset=utf-8",
    // data to send to the server, send as String for independence of server-side programming language
    data: JSON.stringify(timestampQuery),
    // timeout set to 10 seconds
    timeout: 10000
  })

  // if the request is done successfully, ...
  .done (function (response) {

    // ... give a notice on the console that the AJAX request for removing old Unwetter timestamps has succeeded
    console.log("AJAX request (removing old Unwetter timestamps) is done successfully.");

    // delete each Unwetter from database that has an empty timestamp-array
    removeOldUnwetterFromDB2();
  })


  // if the AJAX-request has failed, ...
  .fail (function (xhr, status, error) {

    // ... give a notice that the AJAX request for removing old Unwetter timestamps has failed and show the error on the console
    console.log("AJAX request (removing old Unwetter timestamps) has failed.", error);

    // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
    if (error === "timeout") {
      //    JL("ajax........Timeout").fatalException("ajax: '/db/removeUnwetterTimestamps' timeout");
    }
  });
}



/**
* @desc Deletes all Unwetter from database which have an empty Array "timestamps".
* TODO: AUCH ZUGEHÖRIGE TWEETS-LÖSCHUNG!!
*
* @author Katharina Poppinga
*/
function removeOldUnwetterFromDB2(){

  let query = {
    "$and": '[ { "type":"Unwetter" },  { "timestamps": { "$size": 0 }} ]'
  };
  //
  $.ajax({
    // use a http DELETE request
    type: "DELETE",
    // URL to send the request to
    url: "/db/delete",
    // type of the data that is sent to the server
    contentType: "application/json; charset=utf-8",
    // query
    data: query,
    // data to send to the server, send as String for independence of server-side programming language
    //data: JSON.stringify(),
    // timeout set to 10 seconds
    timeout: 10000
  })

  // if the request is done successfully, ...
  .done (function (response) {

    // response hilft nicht weiter fürs tweet löschen

    // ... give a notice on the console that the AJAX request for deleting all old Unwetter has succeeded
    console.log("AJAX request (deleting all old Unwetter) is done successfully.");


    // TODO: wie die zu gelöschten Unwettern zugehörigen Tweets löschen? - nicht komfortabel, da MongoDB dokumentenorientierte und nicht-relationale DB ist

    // für jeden Tweet schauen, ob dessen UnwetterID noch vorhanden ist, wäre super aufwändig

    // after deleting old Unwetter, delete their corresponding tweets, too
    // Aufruf für jeden Tweet einzeln nötig
    //    removeOldTweetFromDB();


  })

  // if the AJAX-request has failed, ...
  .fail (function (xhr, status, error) {

    // ... give a notice that the AJAX request for for deleting all old Unwetter has failed and show the error on the console
    console.log("AJAX request (deleting all old Unwetter) has failed.", error);

    // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
    if (error === "timeout") {
      //    JL("ajaxDeletingOldUnwetterTimeout").fatalException("ajax: '/db/deleteOldUnwetter' timeout");
    }
  });
}




/**
* @desc Deletes a tweet given given ID (???) from database.
* ANPASSEN
*
* @author Katharina Poppinga
* @param
*/
function removeOldTweetFromDB(){

  // alle Tweets aus DB löschen, deren zugehörigen Unwetter gelöscht wurden

  let tweetID = {

  };

  // TODO: evtl. neuen Funktionsaufruf zu einer Funktion fürs deleten allgemein machen (Modularisierung, nur falls überhaupt auch andere items gelöscht werden müssen)
  // TODO: tweetID zu iD machen, um code allgemeiner nutzen zu können

  $.ajax({
    // use a http DELETE request
    type: "DELETE",
    // URL to send the request to
    url: "/db/delete",
    // type of the data that is sent to the server
    contentType: "application/json; charset=utf-8",
    // data to send to the server, send as String for independence of server-side programming language
    data: JSON.stringify(tweetID),
    // timeout set to 10 seconds
    timeout: 10000
  })

  // if the request is done successfully, ...
  .done (function (response) {

    // ... give a notice on the console that the AJAX request for deleting ....... has succeeded
    console.log("AJAX request (deleting one Tweet) is done successfully. NOCH NICHT IMPLEMENTIERT");
  })

  // if the AJAX-request has failed, ...
  .fail (function (xhr, status, error) {

    // ... give a notice that the AJAX request for finding one item has failed and show the error on the console
    console.log("AJAX request (deleting one Tweet) has failed.", error);

    // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
    if (error === "timeout") {
      //    JL("ajaxDeletingOneTweetTimeout").fatalException("ajax: '/db/delete' timeout");
    }
  });
}
