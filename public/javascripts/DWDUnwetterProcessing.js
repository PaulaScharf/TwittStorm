// jshint esversion: 6
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
* Once thats finished it retrieves all polygons from the database.
* @author Paula Scharf, Katharina Poppinga
*/
function saveAndReturnNewUnwetterFromDWD() {
  //
  return new Promise((resolve, reject) => {
    // this array will contain all the calls of the function "promiseToPostItem"
    let arrayOfPromises = [];

    // load the GeoJSON from the DWD Geoserver and display the current Unwetter-areas
    $.getJSON('https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=dwd%3AWarnungen_Gemeinden_vereinigt&maxFeatures=200&outputFormat=application%2Fjson', function (data) {
      // EPSG: 4326

      // an async call is necessary here to use the await-functionality for .............................
      (async () => {
        //
        let arrayOfUnwetters = [];

        // AB HIER NEUER VERSUCH
        new Promise((resolve, reject) => {
          // TODO: umbenennen?
          // this array will contain all the calls of the function ???
          let arrayOfPromisesDBCheck = [];

          // async call is necessary here to use the await-functionality for checking the database for existing items
          (async () => {

            //
            for (let i = data.features.length - 1; i >= 0; i--) {

              let currentFeature = data.features[i];

              // TODO: DWD-timestamps in UTC oder MEZ?

              // ONSET is the timestamp that gives the time when the Unwetter-warning begins - it is NOT the timestamp for the moment when the warning was published
              // make an Epoch-milliseconds-timestamp (out of the ONSET-timestamp given by the DWD)
              let onset = Date.parse(currentFeature.properties.ONSET);
              // TODO: Umrechnung in Zeitzone von Date.now fehlt noch!!

              // EXPIRES is the timestamp that gives the time when the Unwetter-warning ends
              // make an Epoch-milliseconds-timestamp (out of the EXPIRES-timestamp given by the DWD)
              let expires = Date.parse(currentFeature.properties.EXPIRES);
              // TODO: Umrechnung in Zeitzone von Date.now fehlt noch!!

              // the current timestamp in Epoch-milliseconds
              let currentTimestamp = Date.now();


              // TODO: BEOBACHTEN, OB OBSERVED AUSREICHT und zu Observed ändern!!
              // ANSONSTEN CERTAINTY FILTER WEGLASSEN, DAMIT OBSERVED UND LIKELY DRIN SIND
              // use only the notifications that are actual reports and not just tests
              if ((currentFeature.properties.STATUS === "Actual") && (onset <= currentTimestamp) && (expires >= currentTimestamp)) {

                // TODO: WEITERE MÖGLICHE FILTER
                // TODO: Filter teilweise hier und teilweise nutzerspezifisch nach der Datenbank einfügen
                //      allUnwetter[i].properties.RESPONSETYPE
                //      allUnwetter[i].properties.URGENCY === "Immediate"
                // weitere Parameter in CAP-Doc, zB Altitude und Ceiling

                // if the notification of this Unwetter is new and not an existing but only updated one ...
                if (currentFeature.properties.MSGTYPE === "Alert"){

                  // ... check whether exactly this item is already stored in the database and do only insert it if not
                  arrayOfPromisesDBCheck.push(checkDBForExisitingUnwetter(currentFeature, arrayOfUnwetters));
                }

                // if the notification of this Unwetter is an existing and only updated one ...
                else {
                  // TODO

                }
              }
            }

            // TODO
            try {
              // wait for all ???
              await Promise.all(arrayOfPromisesDBCheck);
              // return the promise to ???
              console.log(arrayOfPromisesDBCheck);
              console.log(arrayOfUnwetters);
              resolve();
            } catch(e) {
              console.log(e);
              reject("hmmm");
            }

          })();
        })
        .catch(console.error)
        //
        .then(function(result) {

          console.log(result);

          // TODO:
          // hier Gruppierung und DB-POST ausführen?




        }, function(err) {
          console.log(err);
        });



        // ***** formatting the Unwetter which will be inserted into the database: *****

        console.log(arrayOfUnwetters);
        //debugger;
        // TODO: IST DAS FOLGENDE HIER AN DER RICHTIGEN STELLE IM CODE??
        // in groupedUnwetters sind nur die NEU HINZUGEFÜGTEN, NICHT ALLE IN DER DB ENTHALTENEN Unwetter drin
        let groupedUnwetters = groupByArray(arrayOfUnwetters, 'dwd_id');
        console.log(groupedUnwetters);
        groupedUnwetters.forEach(function (item){
          // TODO: parse und stringify müsste sich doch aufheben?
          let currentUnwetter = JSON.parse(JSON.stringify(item.values[0]));
          currentUnwetter.geometry = [];

          for (let i = 0; i < item.values.length; i++) {
            currentUnwetter.geometry.push(item.values[i].geometry);
          }
          console.log("arrayOfPromises.push(promiseToPostItem(currentUnwetter)");
          arrayOfPromises.push(promiseToPostItem(currentUnwetter));
        });

        console.log(arrayOfPromises);
        try {
          // wait for all the posts to the database to succeed
          await Promise.all(arrayOfPromises);
          // return the promise to get all Items
          resolve(promiseToGetAllItems({type: "Unwetter"}));
        } catch(e) {
          console.log(e);
          reject("couldnt post all Unwetter");
        }
      })();
    });
  });
}



/**
* @desc
*
* @author Katharina Poppinga
* @private
* @param {Object} currentFeature - JSON of one specific Unwetter taken from DWD response
* @param {Array} arrayOfUnwetters -
*/
function checkDBForExisitingUnwetter(currentFeature, arrayOfUnwetters){

  // JSON with the ID of the current Unwetter, needed for following database-check
  let iD = {
    dwd_id: currentFeature.properties.IDENTIFIER
  };

  return new Promise((resolve, reject) => {
    // check whether exactly this item is already stored in the database to prevent from inserting it again
    $.ajax({
      // use a http POST request
      type: "POST",
      // URL to send the request to
      url: "/db/readItem",
      // type of the data that is sent to the server
      contentType: "application/json; charset=utf-8",
      // data to send to the server, send as String for independence of server-side programming language
      data: JSON.stringify(iD),
      // timeout set to 10 seconds
      timeout: 10000
    })

    // if the request is done successfully, ...
    .done (function (response) {

      // if the current item already exists in the database ...
      if (response !== "") {
        // ... do not insert it again

        // if this item does not exist in the database ...
      } else {

        // TODO: console-print löschen
        console.log("item currently not in database, insert it now");

        // ... insert it by first formatting the Unwetters JSON and ...
        let currentUnwetter = createUnwetterForDB(currentFeature);
        // ... add it to the arrayOfUnwetters
        // this array will be used for subsequent processing before adding the Unwetter to the
        // Promise (in function saveAndReturnNewUnwetterFromDWD) for inserting all new Unwetter into database
        arrayOfUnwetters.push(currentUnwetter);
      }

      // TODO: was in resolve übergeben?
      resolve(response);
    })

    // if the AJAX-request has failed, ...
    .fail (function (xhr, status, error) {

      // ... give a notice that the AJAX request for finding one item has failed and show the error on the console
      console.log("AJAX request (reading one item) has failed.", error);

      // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
      //  if (error === "timeout") {
      //    JL("ajaxReadingOneItemTimeout").fatalException("ajax: '/routes/readItem' timeout");
      //  }
      reject("AJAX request (reading one item) has failed.");
    });
  });
}



/**
*
*
* FORM WIRD VOR DEM INSERTEN GGFS NOCH VERÄNDERT DURCH GRUPPIERUNG NACH DWD_ID
*/
function createUnwetterForDB(currentFeature){

  //
  let area_color = (currentFeature.properties.EC_AREA_COLOR).split(' ').map(Number);
  let color = rgbToHex(area_color[0], area_color[1], area_color[2]);
  let currentUnwetter = {
    type: "Unwetter",
    dwd_id: currentFeature.properties.IDENTIFIER,
    geometry: currentFeature.geometry,
    properties: {
      // TODO: am Ende überprüfen, ob alle Attribute hier benötigt werden, ansonsten unbenötigte löschen
      ec_Group: currentFeature.properties.EC_GROUP,
      event: currentFeature.properties.EVENT,
      ec_ii: currentFeature.properties.EC_II,
      name: currentFeature.properties.EVENT,
      responseType: currentFeature.properties.RESPONSETYPE,
      urgency: currentFeature.properties.URGENCY,
      severity: currentFeature.properties.SEVERITY,
      parameter: currentFeature.properties.Parameter,
      certainty: currentFeature.properties.CERTAINTY,
      description: currentFeature.properties.DESCRIPTION,
      instruction: currentFeature.properties.INSTRUCTION,
      color: color,
      sent: currentFeature.properties.SENT,
      onset: currentFeature.properties.ONSET,
      effective: currentFeature.properties.EFFECTIVE,
      expires: currentFeature.properties.EXPIRES,
      altitude: currentFeature.properties.ALTITUDE,
      ceiling: currentFeature.properties.CEILING
    }
  };
  // return the formatted Unwetter
  return currentUnwetter;
}


// TODO: Quelle in JSDoc einfügen
/**
*
*
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
  * This function calls 'db/' with AJAX, to retrieve all items that comply to the given query in the database.
  * The logic is wrapped in a promise to make it possible to await it (see saveAndReturnNewUnwetterFromDWD for an example
    * of await).
    * @author Paula Scharf, matr.: 450334
    * @param {Object} query
    * @example getAllItems({type: "Unwetter"})
    */
    // TODO: implement the query
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


    /**
    * This function converts an input "c" to the hex-encoding
    * @author https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    * @param c
    * @returns {string}
    */
    function componentToHex(c) {
      var hex = c.toString(16);
      return hex.length == 1 ? "0" + hex : hex;
    }


    /**
    * This function converts an input of the color values (0 to 255) for red, green and blue to its hex-encoding
    * @author https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    * @param r - red
    * @param g - green
    * @param b - blue
    * @returns {string}
    */
    function rgbToHex(r, g, b) {
      return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }
