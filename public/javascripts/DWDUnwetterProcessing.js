function saveNewUnwetterFromDWD() {
    // load the GeoJSON from the DWD Geoserver and display the current Unwetter-areas
    $.getJSON('https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=dwd%3AWarnungen_Gemeinden_vereinigt&maxFeatures=100&outputFormat=application%2Fjson', function(data) {
        // EPSG: 4326
        for (let i = 0; i < data.features.length; i++) {
            let currentFeature = data.features[i];
            if ((currentFeature.properties.CERTAINTY === "Likely") && (data.features[i].properties.STATUS === "Actual")) {
                let area_color = (currentFeature.properties.EC_AREA_COLOR).split(' ').map(Number);
                let color = rgbToHex(area_color[0],area_color[1],area_color[2]);
                let currentUnwetter = {
                    type: "Unwetter",
                    geometry: currentFeature.geometry,
                    ec_Group: currentFeature.properties.EC_GROUP,
                    ec_ii: currentFeature.properties.EC_II,
                    name: "Leichter SCHNEEFALL",
                    parameter: currentFeature.properties.Parameter,
                    certainty: currentFeature.properties.CERTAINTY,
                    description: currentFeature.properties.DESCRIPTION,
                    color: color,
                    effective: currentFeature.properties.EFFECTIVE,
                    expires: currentFeature.properties.EXPIRES
                };
                postItem(currentUnwetter);
            }
        }
    });
}

/**
 * WIP
 * This function could be used to assign colors to different types of weather events.
 * @param group
 * @returns {string}
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
 * @author Paula Scharf, matr.: 450334
 * @param {Object} item - the item to be posted
 */
function postItem(item) {

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
        .done (function (response) {
            // ... give a notice on the console that the AJAX request for pushing an encounter has succeeded
            console.log("AJAX request (posting an item) is done successfully.");
        })

        // if the request has failed, ...
        .fail(function (xhr, status, error) {
            // ... give a notice that the AJAX request for posting an encounter has failed and show the error on the console
            console.log("AJAX request (posting an item) has failed.", error);

            // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
            if (error === "timeout") {
                //JL("ajaxCreatingEncounterTimeout").fatalException("ajax: 'add' timeout");
            }
        });
}


/**
 * This function calls 'db/' with AJAX, to retrieve all items that comply to the given query in the database.
 * @author Paula Scharf, matr.: 450334
 * @param {Object} query
 * @example getAllItems({type: "Unwetter"})
 */
function getAllItems(query) {

    $.ajax({
        // use a http POST request
        type: "POST",
        // URL to send the request to
        url: "db/",
        // data to send to the server, send as String for independence of server-side programming language
        data: query,
        // type of the data that is sent to the server
        contentType: "application/json; charset=utf-8",
        // type of the data that is sent to the server
        dataType: "json",
        // timeout set to 15 seconds
        timeout: 20000
    })

    // if the request is done successfully, ...
        .done (function (response) {
            // ... give a notice on the console that the AJAX request for pushing an encounter has succeeded
            console.log("AJAX request (posting an item) is done successfully.");
            return response;
        })

        // if the request has failed, ...
        .fail(function (xhr, status, error) {
            // ... give a notice that the AJAX request for posting an encounter has failed and show the error on the console
            console.log("AJAX request (reading all itema) has failed.", error);

            // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
            if (error === "timeout") {
                //JL("ajaxCreatingEncounterTimeout").fatalException("ajax: 'add' timeout");
            }
        });
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
