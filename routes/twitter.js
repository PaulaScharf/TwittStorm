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

// yaml configuration
const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));

var client = new Twitter({
	consumer_key: config.keys.twitter.consumer_key,
	consumer_secret: config.keys.twitter.consumer_secret,
	access_token_key: config.keys.twitter.access_token_key,
	access_token_secret: config.keys.twitter.access_token_secret
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
			res.json(error);
		}
	});
});

module.exports = router;
