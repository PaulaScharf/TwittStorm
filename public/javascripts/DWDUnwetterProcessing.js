// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
 * @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
 * @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
 */



/**
 * This function retrieves the current Unwetter-Polygons from the DWD and
 * NOCH ANPASSEN!!
 *
 * then posts all polygons to the database.
 *
 * @author Paula Scharf, Katharina Poppinga
 * @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
 */
function processUnwettersFromDWD(currentTimestamp) {
  //
  return new Promise((resolve, reject) => {

    // this array will contain all the calls of the function "promiseToPostItem"
    let arrayOfPromises = [];
    //
    let arrayOfGroupedUnwetters = [];
    //
    let arrayUnwettersToPost = [];

    // load the GeoJSON from the DWD Geoserver and display the current Unwetter-areas
    $.getJSON('https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=dwd%3AWarnungen_Gemeinden_vereinigt&maxFeatures=200&outputFormat=application%2Fjson', function (data) {
      // EPSG: 4326

      // ***** formatting the Unwetter which will be inserted into the database afterwards: *****

      //
      let groupedData = groupByArray(data.features, 'id');

      //
      groupedData.forEach(function (item){
        // TODO: parse und stringify müsste sich doch aufheben?
        let currentUnwetter = JSON.parse(JSON.stringify(item.values[0]));
        currentUnwetter.geometry = [];

        //
        for (let i = 0; i < item.values.length; i++) {
          currentUnwetter.geometry.push(item.values[i].geometry);
        }
        //
        arrayOfGroupedUnwetters.push(currentUnwetter);
      });

      //
      new Promise((resolve, reject) => {
        // TODO: umbenennen?
        // this array will contain all the calls of the function ???
        let arrayOfPromisesDBCheck = [];

        // async call is necessary here to use the await-functionality for checking the database for existing items
        (async () => {

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


            // TODO: BEOBACHTEN, OB OBSERVED AUSREICHT und zu Observed ändern!!
            // ANSONSTEN CERTAINTY FILTER WEGLASSEN, DAMIT OBSERVED UND LIKELY DRIN SIND
            // use only the notifications that are actual reports and not just tests
            if ((currentFeature.properties.STATUS === "Actual") && (onset <= currentTimestamp) && (expires >= currentTimestamp)) {

              // TODO: WEITERE MÖGLICHE FILTER
              // TODO: Filter teilweise hier und teilweise nutzerspezifisch nach der Datenbank einfügen
              //      allUnwetter[i].properties.RESPONSETYPE
              //      allUnwetter[i].properties.URGENCY === "Immediate"
              // weitere Parameter in CAP-Doc, zB Altitude und Ceiling


              // check whether exactly this Unwetter is already stored in the database
              // and, depending on its MSGTYPE (Alert, Update, Cancel), add, update or delete if to/from database
              arrayOfPromisesDBCheck.push(checkDBForExistingUnwetter(currentFeature, arrayOfGroupedUnwetters, arrayUnwettersToPost, currentTimestamp));
            }
          }

          //
          try {
            // wait for finished check whether any of the requested Unwetter are already stored in the database
            await Promise.all(arrayOfPromisesDBCheck);
            //
            resolve();

          } catch(e) {
            console.log(e);
            // TODO: e im reject möglich?
            reject(e);
          }
        })();
      })
      //
        .catch(console.error)

        //
        .then(function() {

          // POST each new Unwetter into database
          arrayUnwettersToPost.forEach(function (item){
            arrayOfPromises.push(promiseToPostItem(item));
          });

          try {
            // wait for all POSTs to the database to succeed and ...
            Promise.all(arrayOfPromises)

            // ... then end the function processUnwettersFromDWD to call displayCurrentUnwetters afterwards (this action is specified in requestNewAndDisplayCurrentUnwetters)
              .then(() => {

                resolve();
              });

          } catch(e) {
            console.log(e);
            reject("Could not POST all Unwetters.");
          }

          //
        }, function(err) {
          console.log(err);
        });
    });
  });
}



/**
 * @desc
 *
 * @author Katharina Poppinga
 * @private
 * @param {Object} currentFeature - JSON of one specific Unwetter taken from DWD response
 * @param {Array} arrayOfGroupedUnwetters -
 * @param {Array} arrayUnwettersToPost -
 * @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
 */
function checkDBForExistingUnwetter(currentFeature, arrayOfGroupedUnwetters, arrayUnwettersToPost, currentTimestamp){

  // TODO: auch auf einzelne vorhandene geometrys überprüfen


  //
  return new Promise((resolve, reject) => {
    // JSON with the ID of the current Unwetter, needed for following database-check
    let query = {
      type: "Unwetter",
      dwd_id: currentFeature.properties.IDENTIFIER
    };
    promiseToGetItems(query)
      .catch(function(error) {
        reject(error)
      })
      .then(function(response) {
        // if the current Unwetter (with given dwd_id) ALREADY EXISTS in the database ...
        if (typeof response !== "undefined" && response.length > 0) {
          let responseFirst = response[0];
          // ... do not insert it again but:

          // TODO: evtl. console-print löschen?
          console.log("item already in database, do not insert it again");

          // TODO: FOLGEND IST ES DAVON ABHÄNGIG, OB EINE UPDATE MELDUNG EINE NEUE ODER DIE GLEICHE DWD_ID HAT WIE DIE ZUGEHÖRIGE ALERT MELDUNG!!!!!!!!!! (ÜBERPRÜFEN)
          // ERSTMAL WIRD HIER DAVON AUSGEGANGEN, DASS DIE DWD_IDS DANN UNTERSCHIEDLICH SIND, siehe https://www.dwd.de/DE/leistungen/opendata/help/warnungen/cap_dwd_implementation_notes_de_pdf.pdf?__blob=publicationFile&v=4

          // ... and if its MSGTYPE is "Alert" or "Update" ...
          if ((currentFeature.properties.MSGTYPE === "Alert") || (currentFeature.properties.MSGTYPE === "Update")) {

            // response._id is the Unwetter-item-ID from mongoDB
            // if the array "timestamps" does not already contain the currentTimestamp, append it now:
            if (!(responseFirst.timestamps.includes(currentTimestamp))) {
              updateTimestamp(responseFirst._id, currentTimestamp);
            }

            // ... and if its MSGTYPE is "Cancel" ...
          } else {

            // TODO: delete this Unwetter from database?? (rückwirkend, da Meldung ein Irrtum ist??)
          }


          // if this Unwetter does NOT EXIST in the database ...
        } else {
          // ... and if its MSGTYPE is "Alert" or "Update" ...
          if ((currentFeature.properties.MSGTYPE === "Alert") || (currentFeature.properties.MSGTYPE === "Update")) {

            // TODO: evtl. console-print löschen?
            console.log("item currently not in database, insert it now");

            // ... insert it by first formatting the Unwetters JSON and ...
            let currentUnwetter = createUnwetterForDB(currentFeature, currentTimestamp);
            // ... add it to the arrayOfGroupedUnwetters
            // this array will be used for subsequent processing before adding the Unwetter to the
            // Promise (in function processUnwetterFromDWD) for inserting all new Unwetter into database
            arrayUnwettersToPost.push(currentUnwetter);
          }

          // if the Unwetter does NOT EXIST in the database and its MSGTYPE is "Cancel", do nothing with this Unwetter
        }
        //
        resolve(response);
      });
  });
}



/**
 *
 * timestamps will be inserted in Epoch milliseconds (UTC)
 *
 * FORM WIRD VOR DEM INSERTEN GGFS NOCH VERÄNDERT DURCH GRUPPIERUNG NACH DWD_ID
 * @author Paula Scharf, Katharina Poppinga
 * @param {Object} currentFeature -
 * @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
 */
function createUnwetterForDB(currentFeature, currentTimestamp){

  // TODO: wird "color" am Ende wirklich verwendet? sonst löschen und auch die Funktionen rgbToHex und componentToHex löschen!!

  //
  let area_color = (currentFeature.properties.EC_AREA_COLOR).split(' ').map(Number);
  //let color = rgbToHex(area_color[0], area_color[1], area_color[2]);

  // FÜR ALLE TIMESTAMPS JEDEN REQUESTS (siehe Zettel mit Paula, Jonathan)
  let timestamps = [currentTimestamp];

  // convert the DWD-timestamps to Epoch milliseconds (UTC)
  let sent = Date.parse(currentFeature.properties.SENT);
  let onset = Date.parse(currentFeature.properties.ONSET);
  let effective = Date.parse(currentFeature.properties.EFFECTIVE);
  let expires = Date.parse(currentFeature.properties.EXPIRES);
  //let sent = Date.parse(currentFeature.properties.SENT) + 3600000;
  //let onset = Date.parse(currentFeature.properties.ONSET) + 3600000;
  //let effective = Date.parse(currentFeature.properties.EFFECTIVE) + 3600000;
  //let expires = Date.parse(currentFeature.properties.EXPIRES) + 3600000;

  //
  let currentUnwetter = {
    type: "Unwetter",
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
      // TODO: was ist Parameter? Wozu?
      //parameter: currentFeature.properties.Parameter,
      certainty: currentFeature.properties.CERTAINTY,
      description: currentFeature.properties.DESCRIPTION,
      instruction: currentFeature.properties.INSTRUCTION,
      //color: color,
      sent: sent,
      onset: onset,
      effective: effective,
      expires: expires,
      //altitude: currentFeature.properties.ALTITUDE,
      //ceiling: currentFeature.properties.CEILING
    }
  };
  // return the formatted Unwetter
  return currentUnwetter;
}



/**
 *
 *
 * @author Katharina Poppinga
 * @param {String} _id -
 * @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
 */
function updateTimestamp(_id, currentTimestamp) {

  // JSON with needed data for below called database-action
  let data = {
    _id: _id,
    currentTimestamp: currentTimestamp
  };


  return new Promise((resolve, reject) => {
    //
    $.ajax({
      // use a http PUT request
      type: "PUT",
      // URL to send the request to
      url: "/db/updateUnwetter",
      // type of the data that is sent to the server
      contentType: "application/json; charset=utf-8",
      // data to send to the server, send as String for independence of server-side programming language
      data: JSON.stringify(data),
      // timeout set to 10 seconds
      timeout: 10000
    })

    // if the request is done successfully, ...
      .done (function (response) {

        //
        resolve(response);

      })

      // if the AJAX-request has failed, ...
      .fail (function (xhr, status, error) {

        // ... give a notice that the AJAX request for updating one Unwetter-item has failed and show the error on the console
        console.log("AJAX request (updating one Unwetter) has failed.", error);

        // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
        if (error === "timeout") {
          //    JL("ajaxUpdatingOneUnwetterItemTimeout").fatalException("ajax: '/db/updateUnwetter' timeout");
        }
        reject("AJAX request (reading one item) has failed.");
      });
  });
}



/**
 * Groups an array of objects by a given key (attribute)
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


/**
 * This function calls 'add' with AJAX, to save a given item in the database.
 * The logic is wrapped in a promise to make it possible to await it (see processUnwetterFromDWD for an example
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
      url: "/db/add",
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
 * This function calls 'add' with AJAX, to save the given items in the database.
 * @author Paula Scharf
 * @param arrayOfItems - array which contains the items
 */
function promiseToPostMany(arrayOfItems) {
  return new Promise((resolve, reject) => {
  $.ajax({
    // use a http POST request
    type: "POST",
    // URL to send the request to
    url: "/db/addMany",
    // type of the data that is sent to the server
    contentType: "application/json; charset=utf-8",
    // data to send to the server
    data: JSON.stringify(arrayOfItems),
    // timeout set to 15 seconds
    timeout: 15000
  })
  // if the request is done successfully, ...
    .done(function () {
      // ... give a notice on the console that the AJAX request for pushing an encounter has succeeded
      console.log("AJAX request (posting an item) is done successfully.");
    })

    // if the request has failed, ...
    .fail(function (xhr, status, error) {
      // ... give a notice that the AJAX request for posting an encounter has failed and show the error on the console
      console.log("AJAX request (posting many items) has failed.", error);
      resolve();

      // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
      if (error === "timeout") {
        //JL("ajaxCreatingEncounterTimeout").fatalException("ajax: 'addMany' timeout");
      }
      reject("AJAX request (posting an item) has failed.");
    });
  });
}

/**
 * This function calls 'db/' with AJAX, to retrieve all items that comply to the given query in the database.
 * The logic is wrapped in a promise to make it possible to await it (see saveAndReturnNewUnwetterFromDWD for an example
 * of await).
 * @author Paula Scharf, matr.: 450334
 * @param {Object} query
 * @example promiseToGetItems({type: "Unwetter"})
 */
function promiseToGetItems(query) {
  return new Promise((resolve, reject) => {
    $.ajax({
      // use a http POST request
      type: "POST",
      // URL to send the request to
      url: "db/",
      //
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
