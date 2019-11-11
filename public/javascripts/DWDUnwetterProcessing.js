


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
            console.dir(response);
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
            console.dir(response);
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
