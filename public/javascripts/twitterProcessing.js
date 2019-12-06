// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
 * @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
 * @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
 */


/**
 *
 * @author Paula Scharf, matr.: 450334
 * @param {object} twitterSearchQuery
 * @param {string} unwetterID
 * @returns {Promise<any>}
 */
function saveAndReturnNewTweetsThroughSearch(twitterSearchQuery, unwetterID, unwetterEvent) {
	return new Promise((resolve, reject) => {
		// this array will contain all the calls of the function "promiseToPostItem"
		let arrayOfPromises = [];
		let searchTerm = "";
		twitterSearchQuery.searchWords.forEach(function (item) {
			searchTerm += item + " OR ";
		});
		searchTerm = searchTerm.substring(0,searchTerm.length - 4);

		let arrayOfAllCoordinates = [];
		twitterSearchQuery.geometry.forEach(function (item) {
			item.coordinates[0].forEach(function (coordinates) {
				arrayOfAllCoordinates = arrayOfAllCoordinates.concat(coordinates);
			});
		});
		let enclosingCircle = calculateEnclosingCircle(arrayOfAllCoordinates);
		/* this could be used to make a bbox out of the coordinates instead of the enclosing circle:
		let multilineString = turf.multilinestring(twitterSearchQuery.geometry[0].coordinates[0]);
		let bbox = turf.bbox(multiLineString);
		*/
		let enclosingCircleAsString = "" + (Math.ceil(enclosingCircle.y * 10000000) / 10000000)
			+ "," + (Math.ceil(enclosingCircle.x * 10000000) / 10000000)
			+ "," + Math.ceil(enclosingCircle.r) + "km";
		let searchQuery = {
			q: searchTerm,
			geocode: enclosingCircleAsString,
			result_type: "recent",
			count: 20
		};
		$.ajax({
			// use a http GET request
			type: "POST",
			// URL to send the request to
			url: "/twitter/search",
			// parameters for the search api
			data: searchQuery,
			// data type of the response
			dataType: "json",
			// timeout set to 20 seconds
			timeout: 30000
		})

		// if the request is done successfully, ...
			.done(function (response) {
				(async () => {
					if (response.statuses) {
						for (let i = response.statuses.length - 1; i >= 0; i--) {
							let currentFeature = response.statuses[i];
							if (currentFeature.coordinates) {
								let tweetLocation = turf.point(currentFeature.coordinates.coordinates);
								let polygon = turf.polygon(twitterSearchQuery.geometry[0].coordinates[0]);

								//
								if (turf.booleanPointInPolygon(tweetLocation, polygon)) {

									// TODO: hier prüfen, ob tweet schon in DB vorhanden ist

									let currentStatus = {
										type: "Tweet",
										id: currentFeature.id,
										statusmessage: currentFeature.text,
										author: {
											id: currentFeature.user.id,
											name: currentFeature.user.name,
											location_home: currentFeature.user.location
										},
										timestamp: currentFeature.created_at,
										location_actual: currentFeature.coordinates,
										unwetter_ID: unwetterID, // contains the dwd_id
										unwetter_Event: unwetterEvent
									};
									arrayOfPromises.push(promiseToPostItem(currentStatus));
								}
							}
						}
					} else {
						reject(response);
					}
					try {
						// wait for all the posts to the database to succeed
						await Promise.all(arrayOfPromises);
						// return the promise to get all Items
						resolve(promiseToGetItems({type: "Tweet", unwetter_ID: unwetterID}));
						// ... give a notice on the console that the AJAX request for reading all routes has succeeded
						console.log("AJAX request (reading all Tweets) is done successfully.");
						// if await Promise.all(arrayOfPromises) fails:
					} catch (e) {
						reject("Could not POST all Tweets.");
					}
				})();
			})

			// if the request has failed, ...
			.fail(function (xhr, status, error) {
				// ... give a notice that the AJAX request for reading all routes has failed and show the error on the console
				console.log("AJAX request (reading all tweets) has failed.", error);

				// send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
				if (error === "timeout") {
					//JL("ajaxReadingAllRoutesTimeout").fatalException("ajax: '/routes/readAll' timeout");
				}
			});
	});
}





/**
* @desc
*
* @author Katharina Poppinga
* @private
* @param {Object} currentFeature - JSON of one specific Tweet taken from DWD response
* @param {Array} arrayOfGroupedUnwetters -
* @param {Array} arrayUnwettersToPost -
* @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
*/
function checkDBForExistingTweet(currentFeature, arrayOfGroupedUnwetters, arrayUnwettersToPost, currentTimestamp){

  // TODO: auch auf einzelne vorhandene geometrys überprüfen

  //
  return new Promise((resolve, reject) => {
    // JSON with the ID of the current Unwetter, needed for following database-check
    let query = {
      type: "Tweet",
      id: currentFeature.id
    };

    //
    promiseToGetItems(query)
    .catch(function(error) {
      reject(error);
    })
    .then(function(response) {

      // if the current Tweet (with given id) ALREADY EXISTS in the database ...
      if (typeof response !== "undefined" && response.length > 0) {
        let responseFirst = response[0];
        // ... do not insert it again but:

        // TODO: evtl. console-print löschen?
        console.log("item already in database, do not insert it again");


        // if this Tweet does NOT EXIST in the database ...
      } else {

          // TODO: evtl. console-print löschen?
          console.log("item currently not in database, insert it now");

          // ... insert it by first formatting the Unwetters JSON and ...
          let currentUnwetter = createUnwetterForDB(currentFeature, currentTimestamp);
          // ... add it to the arrayOfGroupedUnwetters
          // this array will be used for subsequent processing before adding the Unwetter to the
          // Promise (in function processUnwetterFromDWD) for inserting all new Unwetter into database
          arrayUnwettersToPost.push(currentUnwetter);
        }

      //
      resolve(response);
    });
  });
}






















/**
 * Calculates the smallest enclosing circle around an array of coordinates.
 * @author Paula Scharf, matr.: 450334
 * @param {Array} coordinatesAsArrays
 * @returns {object} enclosing - circle object of the form: {x: longitude, y: latitude, r: radius in degree}
 */
function calculateEnclosingCircle(coordinatesAsArrays) {
	let coordinatesAsObjects = [];
	coordinatesAsArrays.forEach(function (item) {
		let coordinateObject = {
			x: item[0],
			y: item[1]
		};
		coordinatesAsObjects.push(coordinateObject);
	});
	let enclosing = makeCircle(coordinatesAsObjects);
	// convert the radius from degrees to kilometers (or: transform the ellipse into a circle)
	// the maximum amount of kilometers a degree can be in germany is 111.32318 km
	// the maximum is reached at the northern extent of germany (at latitude: 54.983104153)
	enclosing.r = enclosing.r * 111.32318;
	return enclosing;
}
