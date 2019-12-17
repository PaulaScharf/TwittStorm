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
* Afterwards, deletes those Unwetter which then have an empty Array "timestamps" and deletes their coresponding Tweets, too.
*
* @author Katharina Poppinga
* @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
*/
function removeOldUnwetterAndTweetsFromDB(currentTimestamp){

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

    // delete all Unwetter from database which have an empty timestamp-array and delete their corresponding tweets, too
    removeOldUnwetterAndTweetsFromDB2();
  })


  // if the AJAX-request has failed, ...
  .fail (function (xhr, status, error) {

    // ... give a notice that the AJAX request for removing old Unwetter timestamps has failed and show the error on the console
    console.log("AJAX request (removing old Unwetter timestamps) has failed.", error);

    // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
    if (error === "timeout") {
      //    JL("ajax........Timeout").fatalException("ajax: '/db/update' timeout");
    }
  });
}



/**
* @desc Deletes all Unwetter from database which have an empty Array "timestamps"
* and deletes their corresponding Tweets.
*
* @author Katharina Poppinga
*/
function removeOldUnwetterAndTweetsFromDB2() {

  let queryGetOldUnwetter = {
    "$and": '[ { "type":"Unwetter" },  { "timestamps": { "$size": 1 }} ]'
  };

  // get all Unwetter from database which have an empty Array "timestamps"
  $.ajax({
    // use a http POST request
    type: "POST",
    // URL to send the request to
    url: "/db/",
    // type of the data that is sent to the server
    contentType: "application/json; charset=utf-8",
    // query
    data: JSON.stringify(queryGetOldUnwetter),
    // data to send to the server, send as String for independence of server-side programming language
    //data: JSON.stringify(),
    // timeout set to 10 seconds
    timeout: 10000
  })

  // if the request is done successfully, ...
  .done (function (response) {

    // ... give a notice on the console that the AJAX request for getting all old Unwetter has succeeded
    console.log("AJAX request (getting all old Unwetter) is done successfully.");

    console.log(response);
    let oldUnwetterIDs = [];
    for (let u = 0; u < response.length; u++) {
      oldUnwetterIDs.push(response[u].dwd_id);
    }
    console.log(oldUnwetterIDs);

    removeOldUnwetterFromDB(oldUnwetterIDs);
    removeOldTweetsFromDB(oldUnwetterIDs);
  })

  // if the AJAX-request has failed, ...
  .fail (function (xhr, status, error) {

    // ... give a notice that the AJAX request for getting all old Unwetter has failed and show the error on the console
    console.log("AJAX request (getting all old Unwetter) has failed.", error);

    // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
    if (error === "timeout") {
      //    JL("ajaxGettingOldUnwetterTimeout").fatalException("ajax: '/db/' timeout");
    }
  });
}



/**
* @desc Deletes old Unwetter ................. from database.
* ANPASSEN
*
* @author Katharina Poppinga
* @param {} unwetterIDs -
*/
function removeOldUnwetterFromDB(unwetterIDs){

  // delete all Unwetter from database which have an empty Array "timestamps"
  let query = {
    // TODO syntax berichtigen
    "$and": '[ { "type":"Unwetter" },  { "$or": [ { "dwd_id": { } } ] } ]'

//    }+ unwetterIDs + '"} ]'
  };

  //$or: [id, id,...]
console.log(JSON.stringify(query));


  //
  $.ajax({
    // use a http DELETE request
    type: "DELETE",
    // URL to send the request to
    url: "/db/delete",
    // type of the data that is sent to the server
    contentType: "application/json; charset=utf-8",
    // data to send to the server, send as String for independence of server-side programming language
    data: JSON.stringify(query),
    // timeout set to 10 seconds
    timeout: 10000
  })

  // if the request is done successfully, ...
  .done (function (response) {

    // ... give a notice on the console that the AJAX request for deleting all old Unwetter has succeeded
    console.log("AJAX request (deleting all old Unwetter) is done successfully.");
  })

  // if the AJAX-request has failed, ...
  .fail (function (xhr, status, error) {

    // ... give a notice that the AJAX request for for deleting all old Unwetter has failed and show the error on the console
    console.log("AJAX request (deleting all old Unwetter) has failed.", error);

    // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
    if (error === "timeout") {
      //    JL("ajaxDeletingOldUnwetterTimeout").fatalException("ajax: '/db/delete' timeout");
    }
  });
}



// UnwetterID der Tweets ist die DWD-ID der Unwetter

/**
* @desc Deletes old tweets ................. from database.
* ANPASSEN
*
* @author Katharina Poppinga
* @param {} unwetterIDs -
*/
function removeOldTweetsFromDB(unwetterIDs){

  // alle Tweets aus DB löschen, deren zugehörigen Unwetter gelöscht wurden
  let query = {
    "$and": '[ { "type":"Tweet" },  { "unwetter_ID": "$or": "' + unwetterIDs + '"} ]'
  };

  //
  $.ajax({
    // use a http DELETE request
    type: "DELETE",
    // URL to send the request to
    url: "/db/delete",
    // type of the data that is sent to the server
    contentType: "application/json; charset=utf-8",
    // data to send to the server, send as String for independence of server-side programming language
    data: JSON.stringify(query),
    // timeout set to 10 seconds
    timeout: 10000
  })

  // if the request is done successfully, ...
  .done (function (response) {

    // ... give a notice on the console that the AJAX request for deleting ....... has succeeded
    console.log("AJAX request (deleting old Tweets) is done successfully. NOCH NICHT IMPLEMENTIERT");
  })

  // if the AJAX-request has failed, ...
  .fail (function (xhr, status, error) {

    // ... give a notice that the AJAX request for finding one item has failed and show the error on the console
    console.log("AJAX request (deleting old Tweets) has failed.", error);

    // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
    if (error === "timeout") {
      //    JL("ajaxDeletingOneTweetTimeout").fatalException("ajax: '/db/delete' timeout");
    }
  });
}
