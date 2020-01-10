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

// yaml configuration
const fs = require('fs');
const yaml = require('js-yaml');
let config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));

//
router.post("/", (req, res) => {
	config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));
	try {
		for (let key in req.body) {
			if (req.body.hasOwnProperty(key)) {
				if (key === "map.zoom" || key === "map.center" || key === "max_age_tweets" || key === "current_time") {
					var schema = config;
					var pList = key.split('.');
					var len = pList.length;
					for (var i = 0; i < len - 1; i++) {
						var elem = pList[i];

						// TODO: was passiert hier??
						if (!schema[elem]) schema[elem] = {};
						schema = schema[elem];
					}
					try {
						schema[pList[len - 1]] = JSON.parse(req.body[key]);
					} catch {
						schema[pList[len - 1]] = req.body[key];
					}
				}
			}
		}
		let yamlStr = yaml.safeDump(config);
		fs.writeFileSync('config.yaml', yamlStr, 'utf8');
		res.status(200).send();
	} catch (error) {
		res.status(500).send({err_msg: error});
	}
});


// TODO: konform mit API Doc?
/**
*
*
* @author Katharina Poppinga
* @param {number} currentTimestamp - timestamp of .....(Zeitpunkt der Erstellung)..... in Epoch milliseconds
*/
function updateCurrentTimestampInConfigYaml(currentTimestamp){

	config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));
	config["timestamp_last_warnings_request"] = currentTimestamp;
	let yamlStr = yaml.safeDump(config);
	fs.writeFileSync('config.yaml', yamlStr, 'utf8');
}


module.exports.updateCurrentTimestampInConfigYaml = updateCurrentTimestampInConfigYaml;

module.exports.router = router;
