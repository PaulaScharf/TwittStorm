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

const {promiseToGetItems,promiseToPostItems,promiseToDeleteItems} = require('./dataPromisesHelpers.js');
const {makeCircle} = require('./geometryHelpers.js');
var turf = require('@turf/turf');


var Twitter = require('twitter');

// yaml configuration
const fs = require('fs');
const yaml = require('js-yaml');
let config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));

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

/**
 *
 * @author Paula Scharf, matr.: 450334
 * @param params
 * @returns {Promise<any>}
 */
var promiseToGetTweetsFromTwitter = function(params) {
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
 * Checks if there are already tweets for a certain warning at a certain time inside the database.
 * @author Paula Scharf
 * @param dwd_id
 * @param currentTime
 * @param db
 */
function checkForExistingTweets(dwd_id, currentTime, db) {
	//
	return new Promise((resolve, reject) => {
		// JSON with the ID of the current Unwetter, needed for following database-check
		let query = {
			type: "tweet",
			dwd_id: dwd_id,
			$and: [
				{"requestTime": {"$gt": (currentTime - 299000)}},
				{"requestTime": {"$lt": (currentTime + 299000)}}
			]
		};
		promiseToGetItems(query, db)
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
 * @param req
 * @param res
 */
const searchTweetsForEvent = function(req, res) {
	config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));
	let validParams = checkParamsSearch(req.body);

	if (validParams.err_message !== "") {
		res.status(422).send(validParams);
	} else {
		checkForExistingTweets(req.body.dwd_id, req.body.currentTimestamp, req.db)
			.catch(function (error) {
				if(!res.headersSent) {
					res.status(500).send({
						err_msg: error,
						while: "checking if there are already tweets available for this request"
					});
				}
			})
			.then(function (response) {
				if (!response) {
					if ((req.body.currentTimestamp >= config.demo.timestamp_start && req.body.currentTimestamp <= config.demo.timestamp_end)) {
						fs.readFile( './demo/tweets.txt', 'utf8', function (err, data) {
							// Success!
							var arrayOfItems = JSON.parse(data);
							promiseToPostItems(arrayOfItems, req.db)
								.then(function () {
									let searchedTweets = [];
									arrayOfItems.forEach(function(tweet) {
										if(tweet.dwd_id == req.body.dwd_id) {
											searchedTweets.push(tweet);
										}
									});
									if(!res.headersSent) {
										res.send({
											statuses: searchedTweets
										});
									}
								})
								.catch(function (error) {
									if (!res.headersSent) {
										res.status(500).send({err_msg: error, while: "while posting tweets to the database"});
									}
								});
						});
					} else {
						let arrayOfTweets = [];
						let searchTerm = "";
						req.body.twitterSearchQuery.searchWords.forEach(function (item) {
							searchTerm += item + " OR ";
						});
						searchTerm = searchTerm.substring(0, searchTerm.length - 4);
						let arrayOfAllCoordinates = [];
						req.body.twitterSearchQuery.geometry.coordinates.forEach(function (feature) {
							feature.forEach(function (item) {
								arrayOfAllCoordinates = arrayOfAllCoordinates.concat(item);
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
							count: 100
						};

						promiseToGetTweetsFromTwitter(searchQuery)
							.catch(function (error) {
								if (!res.headersSent) {
									res.status(500).send({
										err_msg: error,
										while: "retrieving new tweets through the twitter client"
									});
								}
							})
							.then(function (tweets) {
								try {
									if (tweets) {
										let arrayOfPolygons = [];
										req.body.twitterSearchQuery.geometry.coordinates.forEach(function (item) {
											arrayOfPolygons.push(item[0]);
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
														type: "tweet",
														id: currentFeature.id,
														idstr: currentFeature.id_str,
														statusmessage: currentFeature.text,
														author: {
															id: currentFeature.user.id,
															name: currentFeature.user.name,
															location_home: currentFeature.user.location
														},
														timestamp: Date.parse(currentFeature.created_at),
														location_actual: currentFeature.coordinates,
														dwd_id: req.body.dwd_id,
														requestTime: req.body.currentTimestamp
													};
													arrayOfTweets.push(currentStatus);
												}
											}
										}
									}
									if (arrayOfTweets.length === 0) {
										let emptyTweet = {
											type: "tweet",
											dwd_id: req.body.dwd_id,
											requestTime: req.body.currentTimestamp
										};
										arrayOfTweets.push(emptyTweet);
									}
									promiseToPostItems(arrayOfTweets, req.db)
										.catch(function (error) {
											if (!res.headersSent) {
												res.status(500).send({err_msg: error, while: "posting tweets to the database"});
											}
										})
										.then(function () {
											let query = {type: "tweet", dwd_id: req.body.dwd_id};
											promiseToGetItems(query, req.db)
												.catch(function (error) {
													if (!res.headersSent) {
														res.status(500).send({
															err_msg: error,
															while: "getting tweets from the database"
														});
													}
												})
												.then(function (response) {
													if (!res.headersSent) {
														res.send({
															statuses: response
														});
													}
												});
										});
								} catch (error) {
									if (!res.headersSent) {
										res.status(500).send({err_msg: error, while: "processing the newly retrieved tweets"});
									}
								}
							}, function (error) {
								if (!res.headersSent) {
									res.status(500).send({
										err_msg: error,
										while: "retrieving new tweets through the twitter client"
									});
								}
							});
					}
				} else {
					let query = {type: "tweet", dwd_id: req.body.dwd_id};
					promiseToGetItems(query, req.db)
						.catch(function (error) {
							if(!res.headersSent) {
								res.status(500).send({err_msg: error, while: "getting tweets from the database"});
							}
						})
						.then(function (response) {
							if(!res.headersSent) {
								res.send({
									statuses: response
								});
							}
						});

				}
			}, function (error) {
				if(!res.headersSent) {
					res.status(500).send({err_msg: error});
				}
			})
			.catch(function (error) {
				if(!res.headersSent) {
					res.status(500).send({
						err_msg: error,
						while: "checking if there are already tweets available for this request"
					});
				}
			});
	}
};


/**
 *
 * @author Paula Scharf
 * @param params
 */
function checkParamsSearch(params) {
	if (!params.dwd_id) {
		return {
			err_message: "'dwd_id' is not defined"
		};
	} else if (!params.currentTimestamp) {
		return {
			err_message: "'currentTimestamp' is not defined"
		};
	} if (!params.twitterSearchQuery) {
		return {
			err_message: "'twitterSearchQuery' is not defined"
		};
	} if (!params.twitterSearchQuery.geometry) {
		return {
			err_message: "'twitterSearchQuery.geometry' is not defined"
		};
	} if (!params.twitterSearchQuery.searchWords) {
		return {
			err_message: "'twitterSearchQuery.searchWords' is not defined"
		};
	} if (typeof params.twitterSearchQuery.searchWords !== "object") {
		return {
			err_message: "'twitterSearchQuery.searchWords' has to contain an array"
		};
	}

	return {
		err_message: ""
	};
}

// TODO: JSDoc
/**
 *
 * @author Paula Scharf
 * @param req
 * @param res
 */
const deleteTweet = function(req, res) {
	if (!req.body.idstr) {
		if(!res.headersSent) {
			res.status(422).send({err_msg: "id is not defined"});
		}
	} else {
		promiseToDeleteItems(req.body, req.db)
			.catch(function (error) {
				if (!res.headersSent) {
					res.status(500).send({err_msg: error, while: "deleting a tweet from the database"});
				}
			})
			.then(function () {
				if (!res.headersSent) {
					res.send();
				}
			}, function (error) {
				if (!res.headersSent) {
					res.status(500).send({err_msg: error, while: "deleting a tweet from the database"});
				}
			})
	}
};

router.route("/tweets").post(searchTweetsForEvent);
router.route("/tweet").delete(deleteTweet);

module.exports = router;
