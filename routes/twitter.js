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

var Twitter = require('twitter');

var client = new Twitter({
	consumer_key: require("../public/javascripts/tokens.js").token.twitter.consumer_key,
	consumer_secret: require("../public/javascripts/tokens.js").token.twitter.consumer_secret,
	access_token_key: require("../public/javascripts/tokens.js").token.twitter.access_token_key,
	access_token_secret: require("../public/javascripts/tokens.js").token.twitter.access_token_secret
});

router.post("/search", (req, res) => {
	let params = {};
	for (let key in req.body) {
		if (req.body.hasOwnProperty(key)) {
			params[key] = req.body[key];
		}
	}

	client.get('search/tweets', params, function (error, tweets, response) {
		if (!error) {
			// send the result to the ajax request
			res.json(JSON.parse(response.body));
		} else {
			console.dir(error);
			res.json(error);
		}
	});
});

module.exports = router;
