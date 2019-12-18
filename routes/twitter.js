// jshint esversion: 8
// jshint node: true
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
 * @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
 * @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
 */


var express = require('express');
var router = express.Router();
//var app = require('../app.js');

const {postItems} = require('./dataHelpers.js');
const {makeCircle} = require('./geometryHelpers.js');
var turf = require('@turf/turf');


var Twitter = require('twitter');

// yaml configuration
const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));

let collectionName = config.mongodb.collection_name;

var client = new Twitter({
	consumer_key: config.keys.twitter.consumer_key,
	consumer_secret: config.keys.twitter.consumer_secret,
	access_token_key: config.keys.twitter.access_token_key,
	access_token_secret: config.keys.twitter.access_token_secret
});


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

var searchTweets = function(params) {
	return new Promise((resolve, reject) => {
		client.get('search/tweets', params, function (error, tweets, response) {
			if (!error) {
				// send the result to the ajax request
				resolve(JSON.parse(response.body));
			} else {
				reject(error);
			}
		});
	});
};

/**
 * Checks if there are already tweets for a certain unwetter at a certain time inside the database.
 * @author Paula Scharf
 * @param dwd_id
 * @param currentTime
 */
function checkForExistingTweets(dwd_id, currentTime, db) {
	//
	return new Promise((resolve, reject) => {
			// JSON with the ID of the current Unwetter, needed for following database-check
			let query = {
				type: "Tweet",
				event_ID: dwd_id,
				$and: [
					{"requestTime": {"$gt": (currentTime - 299000)}},
					{"requestTime": {"$lt": (currentTime + 299000)}}
				]
			};
			promiseToGet(query, db)
				.catch(function (error) {
					reject(error);
				})
				.then(function (result) {
					if (result && result.length > 0) {
						resolve(true);
					} else {
						resolve(false);
					}
				});
	});
}

/**
 * Makes a request for new tweets to twitter and saves them in the database.
 * @author Paula Scharf, matr.: 450334
 * @param {object} twitterSearchQuery
 * @param {string} unwetterID
 * @param {string} unwetterEvent
 * @param currentTime
 * @returns {Promise<any>}
 */
var searchTweetsForEvent = function(req, res) {
	console.dir("test");
	let request = JSON.parse(JSON.stringify(req));
	checkForExistingTweets(request.body.eventID, request.body.currentTimestamp, request.db)
		.catch(console.error)
		.then( function (response) {
			if (!response) {
				let arrayOfTweets = [];
				let searchTerm = "";
				request.body.twitterSearchQuery.searchWords.forEach(function (item) {
					searchTerm += item + " OR ";
				});
				searchTerm = searchTerm.substring(0,searchTerm.length - 4);
				let arrayOfAllCoordinates = [];
				request.body.twitterSearchQuery.geometry.coordinates.forEach(function (feature) {
					feature.forEach(function (item) {
						arrayOfAllCoordinates = arrayOfAllCoordinates.concat(item);
					})
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

				searchTweets(searchQuery)
					.catch(console.error)
					.then( function (tweets) {
						if (tweets) {
							let arrayOfPolygons = [];
							request.body.twitterSearchQuery.geometry.coordinates.forEach(function (item) {
								arrayOfPolygons.push(item[0])
							});
							let polygon = turf.polygon(arrayOfPolygons);
							for (let i = tweets.statuses.length - 1; i >= 0; i--) {
								let currentFeature = tweets.statuses[i];
								let max_age = 0;
								if (config.max_age_tweets !== null) {
									max_age = currentTime - (config.max_age_tweets * 60000);
								}
								let age_tweet = Date.parse(currentFeature.created_at);
								if (currentFeature.coordinates && age_tweet >= max_age) {
									let tweetLocation = turf.point(currentFeature.coordinates.coordinates);
									if (turf.booleanPointInPolygon(tweetLocation, polygon)) {
										let currentStatus = {
											type: "Tweet",
											id: currentFeature.id,
											idstr: currentFeature.id_str,
											statusmessage: currentFeature.text,
											author: {
												id: currentFeature.user.id,
												name: currentFeature.user.name,
												location_home: currentFeature.user.location
											},
											timestamp: currentFeature.created_at,
											location_actual: currentFeature.coordinates,
											event_ID: request.body.eventID,
											requestTime: request.body.currentTimestamp
										};
										arrayOfTweets.push(currentStatus);
									}
								}
							}
						}
						try {
							if (arrayOfTweets.length === 0) {
								let emptyTweet = {
									type: "Tweet",
									event_ID: request.body.eventID,
									requestTime: request.body.currentTimestamp
								};
								arrayOfTweets.push(emptyTweet);
							}
							promiseToPost(arrayOfTweets,request.db)
								.catch(console.error)
								.then( function () {
									let query = {type: "Tweet", event_ID: request.body.eventID};
									promiseToGet(query,request.db)
										.catch(console.error)
										.then( function (response) {
											console.dir(response);
											res.send(response);
										});
								});
						} catch (e) {
							console.dir(e);
							res.status(500).send(e);
						}
					});
			} else {
				request.db.collection(collectionName).find({type: "Tweet", event_ID: request.body.eventID}, (error, result) => {
					if(error){
						// give a notice, that the inserting has failed and show the error on the console
						console.log("Failure while inserting an item into '" + collectionName + "'.", error);
						// in case of an error while inserting, do routing to "error.ejs"
						res.status(500).send(error);
						// if no error occurs ...
					} else {
						// ... give a notice, that the reading has succeeded and show the result on the console
						console.log("Successfully read the items from '" + collectionName + "'.");
						res.send(result);
					}
				});
			}
		}, function(error) {
			console.dir(error);
			res.status(500).send(error);
		});
};

function promiseToPost(arrayOfItems, db) {
	return new Promise((resolve, reject) => {
		db.collection(collectionName).insertMany(arrayOfItems, (error, result) => {
			if(error){
				// give a notice, that the inserting has failed and show the error on the console
				console.log("Failure while inserting an item into '" + collectionName + "'.", error);
				// in case of an error while inserting, do routing to "error.ejs"
				reject(error);
				// if no error occurs ...
			} else {
				// ... give a notice, that inserting the item has succeeded
				resolve();
			}
		});
	});
}

function promiseToGet(query, db) {
	return new Promise((resolve, reject) => {
		try {
			// find all
			db.collection(collectionName).find(query).toArray((error, result) => {
				if (error) {
					// give a notice, that the inserting has failed and show the error on the console
					console.log("Failure while inserting an item into '" + collectionName + "'.", error);
					// in case of an error while inserting, do routing to "error.ejs"
					reject(error);
					// if no error occurs ...
				} else {
					// ... give a notice, that the reading has succeeded and show the result on the console
					console.log("Successfully read the items from '" + collectionName + "'.");
					console.dir(query);
					resolve(result);
				}
			});
		} catch(e) {
			reject(e);
		}
	});
}

router.route("/tweets").post(searchTweetsForEvent);

module.exports = router;
