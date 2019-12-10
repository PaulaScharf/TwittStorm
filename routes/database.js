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
const mongodb = require('mongodb');

// yaml configuration
const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));

let collectionName = config.mongodb.collection_name;
// TODO: alle nicht benötigten Routen löschen!!


/**
 *
 * @param input
 * @returns query
 */
function queryParser(input) {
	let query = {};
	for (let key in input) {
		if (input.hasOwnProperty(key)) {
			if (key === "_id") {
				query[key] = new mongodb.ObjectID(input[key]);
			} else if (input[key].charAt(0) === "{" || input[key].charAt(0) === "[") {
				query[key] = JSON.parse(input[key]);
			} else {
				query[key] = input[key];
			}
		}
	}
	return query;
}

/* GET items */
router.post("/", function(req, res) {
	var db = req.db;
	let query = queryParser(req.body);

	// find all
	db.collection(collectionName).find(query).toArray((error, result) => {
		if(error){
			// give a notice, that reading all items has failed and show the error on the console
			console.log("Failure in reading all items from '" + collectionName + "'.", error);
			// in case of an error while reading, do routing to "error.ejs"
			res.render('error');
			//       // if no error occurs ...
		} else {
			// ... give a notice, that the reading has succeeded and show the result on the console
			console.log("Successfully read the items from '" + collectionName + "'.");
			// ... and send the result to the ajax request
			res.json(result);
		}
	});
});


// *********************** inserting .........: ***********************
/* POST to add single item. */
router.post('/add', function(req, res) {
	var db = req.db;

	db.collection(collectionName).insertMany(req.body, (error, result) => {
		if(error){
			// give a notice, that the inserting has failed and show the error on the console
			console.log("Failure while inserting an item into '" + collectionName + "'.", error);
			// in case of an error while inserting, do routing to "error.ejs"
			res.render('error');
			// if no error occurs ...
		} else {
			// ... give a notice, that inserting the item has succeeded
			res.json({
				error: 0,
				msg: "items angelegt."
			});
		}
	});

});


// TODO: updateMany() verwenden?

// *********************** updating .........: ***********************
/* update Unwetter */
router.put("/update", (req, res) => {

	var db = req.db;

	let id = req.body.query._id;

	let query = queryParser(req.body.query);
	let update = queryParser(req.body.update);

	console.log("update Unwetter " + id);
	
	db.collection(collectionName).updateMany(query,	update, (error, result) => {

		if (error) {
			// give a notice, that the updating has failed and show the error on the console
			console.log("Failure while adding Unwetter-timestamp in '" + collectionName + "'.", error);
			// in case of an error while updating, do routing to "error.ejs"
			res.render('error');
			// if no error occurs ...
		} else {
			// ... give a notice, that updating the item has succeeded
			console.log("Successfully added Unwetter-timestamp in '" + collectionName + "'.");
			res.json(result);
		}
	});
});


// TODO: ausprobieren, ob es funktioniert:

// *********************** updating the Array of timestamps of Unwetters : ***********************
router.put("/removeUnwetterTimestamps", (req, res) => {

	var db = req.db;


	//delete req.body._id;

	// filter database for Unwetters and ...
	db.collection(collectionName).updateMany( {type:"Unwetter"},

	// TODO: überprüfen, ob $lt oder $lte nötig ist !!!!
	// ... remove timestamps in the timestamp-Array that are older than 10 timesteps (50 minutes, specified in timestampDeleting)
	{$pull: {timestamps: { $lt: req.body.timestampDeleting }}}, (error, result) => {

		if (error) {
			// give a notice, that the updating has failed and show the error on the console
			console.log("Failure while removing Unwetter-timestamps in '" + collectionName + "'.", error);
			// in case of an error while updating, do routing to "error.ejs"
			res.render('error');

			// if no error occurs ...
		} else {
			// ... give a notice, that updating the Unwetter has succeeded
			console.log("Successfully removed Unwetter-timestamps in '" + collectionName + "'.");
			res.json(result);
		}
	});
});



// TODO: ausprobieren, ob es funktioniert:

// *********************** deleting ...........: ***********************
/* DELETE old Unwetters */
router.delete("/deleteOldUnwetter", (req, res) => {

	var db = req.db;

	console.log("deleting all old Unwetter");

	// filter database for Unwetters whose timestamps-Array is empty
	db.collection(collectionName).deleteMany(
		{ $and: [ { type:"Unwetter" },  { timestamps: { $size: 0 } } ]

	}, (error, result) => {

		if (error){
			// give a notice, that the deleting has failed and show the error on the console
			console.log("Failure while deleting all old Unwetter from '" + collectionName + "'.", error);
			// in case of an error while deleting, do routing to "error.ejs"
			res.render('error');

			// if no error occurs ...
		} else {
			// ... give a notice, that deleting the Unwetter has succeeded
			console.log("Successfully deleted all old Unwetter from '" + collectionName + "'.");
			res.json(result);
		}
	});
});




// TODO:
// *********************** deleting ...........: ***********************
/* DELETE old Tweets */
router.delete("/delete", (req, res) => {

	var db = req.db;

	console.log("delete ... " + req.query._id);

	// filter database for Unwetters and ...
	db.collection(collectionName).deleteOne( {type:"Tweet"},

	// TODO: query
	{  } , (error, result) => {

		if (error){
			// give a notice, that the deleting has failed and show the error on the console
			console.log("Failure while deleting a Tweet from '" + collectionName + "'.", error);
			// in case of an error while deleting, do routing to "error.ejs"
			res.render('error');
			// if no error occurs ...
		} else {
			// ... give a notice, that deleting the Unwetter has succeeded
			console.log("Successfully deleted a Tweet from '" + collectionName + "'.");
			res.json(result);
		}
	});
});


module.exports = router;
