// jshint esversion: 6
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
 * @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
 * @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
 */

/**
 * This function retrieves the current Unwetter-Polygons from the dwd and then posts all polygons to the database.
 * Once thats finished it retrieves all polygons from the database.
 * @author Paula Scharf, matr.: 450334
 */
function saveAndReturnNewUnwetterFromDWD() {
    return new Promise((resolve, reject) => {
        // This array will contain all the the calls of the function "promiseToPostItem"
        let arrayOfPromises = [];
        // load the GeoJSON from the DWD Geoserver and display the current Unwetter-areas
        $.getJSON('https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=dwd%3AWarnungen_Gemeinden_vereinigt&maxFeatures=100&outputFormat=application%2Fjson', function (data) {
            // EPSG: 4326
            // an async call is necessary here to use the await-functionality
            (async () => {
                let arrayOfUnwetters = [];
                for (let i = data.features.length - 1; i >= 0; i--) {
                    let currentFeature = data.features[i];
                    // TODO: BEOBACHTEN, OB OBSERVED AUSREICHT und zu Observed ändern!!
                    // TODO: ANSONSTEN CERTAINTY FILTER WEGLASSEN, DAMIT OBSERVED UND LIKELY DRIN SIND
                    // ... and use only the notifications that are actual reports and not just tests
                    if ((currentFeature.properties.CERTAINTY === "Likely") && (data.features[i].properties.STATUS === "Actual")) {
                        // TODO: WEITERE MÖGLICHE FILTER
                        // TODO: Filter teilweise hier und teilweise nutzerspezifisch nach der Datenbank einfügen
                        //      allUnwetter[i].properties.RESPONSETYPE
                        //      allUnwetter[i].properties.URGENCY === "Immediate"

                        //      allUnwetter[i].properties.ONSET       GIBT ANFANGSZEIT, AB WANN WARNUNG GILT
                        //      allUnwetter[i].properties.EXPIREs     GIBT ENDZEIT, BIS WANN WARNUNG GILT
                        // für Zeitformat siehe:  https://www.dwd.de/DE/leistungen/opendata/help/warnungen/cap_dwd_profile_de_pdf.pdf?__blob=publicationFile&v=2

                        // weitere Parameter in CAP-Doc, zB Altitude und Ceiling

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
                        arrayOfUnwetters.push(currentUnwetter);
                    }
                }
                let groupedUnwetters = groupByArray(arrayOfUnwetters, 'dwd_id');
                groupedUnwetters.forEach( function (item) {
                    let currentUnwetter = JSON.parse(JSON.stringify(item.values[0]));
                    currentUnwetter.geometry = [];
                    for (let i = 0; i < item.values.length; i++) {
                        currentUnwetter.geometry.push(item.values[i].geometry);
                    }
                    arrayOfPromises.push(promiseToPostItem(currentUnwetter));
                });
                try {
                    // wait for all the posts to the database to succeed
                    await Promise.all(arrayOfPromises);
                    // return the promise to get all Items
                    resolve(promiseToGetAllItems({type: "Unwetter"}));
                } catch(e) {
                    reject("couldnt post all Unwetter")
                }
            })();
        });
    });
}


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
                reject("AJAX request (posting an item) has failed.")
            });
    });
}


/**
 * This function calls 'db/' with AJAX, to retrieve all items that comply to the given query in the database.
 * The logic is wrapped in a promise to make it possible to await it (see saveAndReturnNewUnwetterFromDWD for an example
 * of await).
 * ATTENTION: currently this function does not support the query, but will instead just return all items of the type
 * "Unwetter".
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
            url: "db/",
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
                reject("AJAX request (reading all items) has failed.")
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
