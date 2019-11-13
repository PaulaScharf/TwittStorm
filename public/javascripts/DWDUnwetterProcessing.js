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
                for (let i = data.features.length - 1; i >= 0; i--) {
                    let currentFeature = data.features[i];
                    // use only the Unwetter which are observed and therefore certain, not just likely ...
                    // TODO: BEOBACHTEN, OB OBSERVED AUSREICHT und zu Observed ändern!!
                    // ... and use only the notifications that are actual reports and not just tests
                    if ((currentFeature.properties.CERTAINTY === "Likely") && (data.features[i].properties.STATUS === "Actual")) {
                        // TODO: WEITERE MÖGLICHE FILTER
                        //      allUnwetter[i].properties.CERTAINTY === "Observed"
                        //      allUnwetter[i].properties.RESPONSETYPE
                        //      allUnwetter[i].properties.URGENCY === "Immediate"
                        //      allUnwetter[i].properties.SEVERITY === "Severe" || allUnwetter[i].properties.SEVERITY === "Extreme"
                        //      allUnwetter[i].properties.HEADLINE beginnt mit "Amtliche UNWETTERWARNUNG"

                        //      allUnwetter[i].properties.ONSET       GIBT ANFANGSZEIT, AB WANN WARNUNG GILT
                        //      allUnwetter[i].properties.EXPIREs     GIBT ENDZEIT, BIS WANN WARNUNG GILT
                        // für Zeitformat siehe:  https://www.dwd.de/DE/leistungen/opendata/help/warnungen/cap_dwd_profile_de_pdf.pdf?__blob=publicationFile&v=2

                        // weitere Parameter in CAP-Doc, zB Altitude und Ceiling

                        let area_color = (currentFeature.properties.EC_AREA_COLOR).split(' ').map(Number);
                        let color = rgbToHex(area_color[0], area_color[1], area_color[2]);
                        let currentUnwetter = {
                            type: "Unwetter",
                            geometry: currentFeature.geometry,
                            properties: {
                                ec_Group: currentFeature.properties.EC_GROUP,
                                ec_ii: currentFeature.properties.EC_II,
                                name: currentFeature.properties.EVENT,
                                parameter: currentFeature.properties.Parameter,
                                certainty: currentFeature.properties.CERTAINTY,
                                description: currentFeature.properties.DESCRIPTION,
                                color: color,
                                effective: currentFeature.properties.EFFECTIVE,
                                expires: currentFeature.properties.EXPIRES
                            }
                        };
                        arrayOfPromises.push(promiseToPostItem(currentUnwetter));
                    }
                }
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

/**
 * WIP
 * This function could be used to assign colors to different types of weather events. It is currently not used.
 * @author Paula Scharf, matr.: 450334
 * @param group - name of the ec_group of Unwetter
 * @returns {string}
 * @example assignColor("FROST")
 */
function assignColor(group) {
    switch (group) {
        case "THUNDERSTORM":
            return "#ff3333"; //red
            break;
        case "WIND":
            return "#ecff33"; //yellow
            break;
        case "TORNADO":
            return "#ffac33"; //orange
            break;
        case "RAIN":
            return "#3349ff"; //blue
            break;
        case "HAIL":
            return "#ff33f6"; //pink
            break;
        case "SNOWFALL":
            return "#33ffe6"; //light blue/green
            break;
        case "SNOWDRIFT":
            return "#33ff99"; //light green/blue
            break;
        case "FOG":
            return "#beff54"; //green/yellow
            break;
        case "FROST":
            return "#33d4ff"; //light blue
            break;
        case "GLAZE":
            return "#6e33ff"; //purple
            break;
        case "THAW":
            return "#00ff1f"; //green
            break;
        case "POWERLINEVIBRATION":
            return "#d654ff"; //purple/pink
            break;
        case "UV":
            return  "#ff547d"; //pink/red
            break;
        case "HEAT":
            return  "#ff8354"; //orange/red
            break;
    }

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
            type: "GET",
            // URL to send the request to
            url: "db/",
            // type of the data that is sent to the server
            contentType: "application/json; charset=utf-8",
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
