// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
	* @desc function to alter the URL, in order to keep it updated
	* can change the value of a parameter or add it to the existing url
	* @author Jonathan Bahlmann
	* @param param the parameter to be updated/inserted
	* @param newString the value to above mentioned parameter
	* @example updateURL("wtype", "radar");
	*/
function updateURL(param, newString) {
	let toInsert = param + "=" + newString;
	let oldURL = document.location.href;
	let indexOfPath = oldURL.indexOf("?");
	let url = oldURL.slice(indexOfPath, oldURL.length);
	let newURL;
	// index of parameter desc
	let index = url.search(param);
 	// if param is found, change it
	if (index > 0) {
		// slice the complete part of url to the right
		let right = url.slice(index, url.length);
		// also get the left parameter
		let left = url.slice(0, index);
		// search for "&"
		let andIndex = right.search("&");
		// if & is found, param lies in the middle
		if (andIndex >= 0) {
			// adjust the right part
			right = right.slice(andIndex, url.length);
			// put things together
			newURL = left + toInsert + right;
		}
		// if no & is found, this lies at the end of the string -> adjust left
		else {
			newURL = left + toInsert;
		}
	}
	// if param is not found, add it
	else {
		newURL = oldURL + "&" + toInsert;
	}

	// if "?" is not found
	if (indexOfPath < 0) {
		// override newURL with "?" + the new param + description
		newURL = "?".concat(param, "=", newString);
	}

	//write this to url
	history.pushState({}, '', newURL);
}

/**
	* @desc
	* function to read a specified parameter from the current URL
	* @author Jonathan Bahlmann
	* @param string Parameter to be returned
	* @returns parameter value
	*/
function readURL(param) {
	// result
	let value;

	let oldURL = document.location.href;
	let index = oldURL.indexOf(param);
	let url = oldURL.slice(index, oldURL.length);
	let indexOfEqual = url.search("=");
	let indexOfAnd = url.search("&");
	// if and is not found, it is end of string
	if(indexOfAnd < 0) {
		indexOfAnd = url.length;
	}

	if(index > 0) {
		value = url.slice(indexOfEqual + 1, indexOfAnd);
		return value;
	} else {
		return "parameter not found."
	}
}
