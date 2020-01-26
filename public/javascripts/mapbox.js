// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/

// an API access token is required for using mapbox GL JS
mapboxgl.accessToken = paramArray.config.keys.mapbox.access_key;

// TODO: JSDoc

// ****************************** global variables *****************************

/**
* main mapbox-map
* @type {Object}
*/
let map;


/**
* refers to the layer menu
* @type {HTML-element-ID}
*/
let layers = document.getElementById('menu');


/**
* referes to all the layers that are not defaults
* @type {Array}
*/
let customLayerIds = [];


/**
* // TODO: JSDoc
* @type {boolean}
*/
let popupsEnabled = true;


/**
* time of app start
* @type {}
*/
let initTimestamp = Date.now();


/**
* Flag that indicates which weathertype is requested
* @type {String}
*/
let wtypeFlag = "";


/**
* // TODO: JSDoc
* @type {}
*/
let filterwords;


/**
* gives the information that the styleswitcher is on the animation page
* @type {String}
*/
var indicator = "";


/**
*
* @type {boolean}
*/
var doneProcessingAOI = true;


/**
*
* @type {boolean}
*/
var doneLoadingWeather = true;


// TODO: folgendes in eine Funktion schreiben:
// TODO: was macht dieser code?
window.twttr = (function(d, s, id) {
	var js, fjs = d.getElementsByTagName(s)[0],
	t = window.twttr || {};
	if (d.getElementById(id)) return t;
	js = d.createElement(s);
	js.id = id;
	js.src = "https://platform.twitter.com/widgets.js";
	fjs.parentNode.insertBefore(js, fjs);

	t._e = [];
	t.ready = function(f) {
		t._e.push(f);
	};

	return t;
}(document, "script", "twitter-wjs"));



// ******************************** functions **********************************

// shows and hides the current status of an AJAX-call
$(document).ajaxSend(function(){
	$('#loading').fadeIn(250);
});
$(document).ajaxComplete(function(){
	$('#loading').fadeOut(250);
});


/**
* @desc Creates a map (using mapbox), centered on Germany, that shows the boundary of Germany
* and all current severe weather warnings requested from the DWD with a legend.
* In addition, a menu for switching between warnings and rain radar data is given.
* For each warning, an onclick-popup is provided, with a description and its period of validity.
* Uses mapbox-gl-draw to enable drawing polygons in this map, to use these as an AOI.
* For a drawn AOI a tweet-search is started and the retrieved tweets (with onclick-popups) are shown in the map, too.
* This function arranges consecutive requests to the DWD, each "refresh_rate"
* (this timestamp-variable is defined in config.yaml) und than updates the shown events in the map.
* Parameters contained in the URL are involved and used.
* This function is called, when "index.ejs" is loaded.
* @author Katharina Poppinga, Jonathan Bahlmann
*/
function showMap() {

	// Checks whether the layer menu DOM is empty and if not flushes the dom
	while (layers.firstChild) {
		layers.removeChild(layers.firstChild);
	}

	let baseURL;
	let zoomURL;
	let centerURL;
	let style;

	var checkedStreets = document.getElementById('navigation-guidance-day-v4');
	var checkedSat = document.getElementById('satellite-v9');

	// if not yet in URL, take and update to default streets
	if (!(readURL("base"))) {
		style = "mapbox://styles/mapbox/navigation-guidance-day-v4";
		updateURL("base", "streets");
		// otherwise use value from URL
	} else {
		if (readURL("base") === "streets") {
			style = "mapbox://styles/mapbox/navigation-guidance-day-v4";
			checkedStreets.checked ='checked';
		}
		if (readURL("base") === "satellite") {
			style = "mapbox://styles/mapbox/satellite-v9";
			checkedSat.checked ='checked';
		}
	}

	// if not yet in URL, use default warnings
	if (!(readURL("wtype"))) {
		updateURL("wtype", "unwetter");
	}

	// if not yet in URL, get value from config.yaml
	if (!(readURL("mapZoom"))) {
		zoomURL = paramArray.config.map.zoom;
		updateURL("mapZoom", zoomURL);
		// otherwise use value from URL
	} else {
		zoomURL = readURL("mapZoom");
	}

	// if not yet in URL, get value from config.yaml
	if (!(readURL("mapCenter"))) {
		centerURL = paramArray.config.map.center;
		updateURL("mapCenter", centerURL);
		// otherwise use value from URL
	} else {
		centerURL = readURL("mapCenter");
		console.log(centerURL);
		// make Object from String
		centerURL = centerURL.substring(1);
		let splittedCenterURL = centerURL.split(',');
		centerURL = {
			lng: splittedCenterURL[0],
			lat: splittedCenterURL[1].substring(0, splittedCenterURL[1].length - 1)
		};
	}

	// create new map with variable zoom and center
	map = new mapboxgl.Map({
		container: 'map',
		style: style,
		zoom: zoomURL,
		center: centerURL
	});

	// update URL when moving the map
	map.on('moveend', function() {
		updateURL('mapZoom', map.getZoom());
		let center = map.getCenter();
		let centerString = "[" + center.lng + "," + center.lat + "]";
		updateURL('mapCenter', centerString);
	});

	// add zoom and rotation controls to the map
	map.addControl(new mapboxgl.NavigationControl());

	// specify and add a control for DRAWING A POLYGON (area-of-interest for tweets) into the map
	let	draw = new MapboxDraw({
		displayControlsDefault: false, // all controls to be off by default for self-specifiying the controls as follows
		controls: {
			polygon: true,
			trash: true // for deleting a drawn polygon
		}
	});
	map.addControl(draw);

	// process drawn polygons
	drawForAOI(map, draw);


	// add a geocoder to the map
	let geocoder = new MapboxGeocoder({
		accessToken: mapboxgl.accessToken,
		mapboxgl: mapboxgl
	});
	geocoder.setLanguage("en");
	geocoder.setZoom(8);
	document.getElementById("geocoder").appendChild(geocoder.onAdd(map));


	// enables the ability to choose between different mapstyles
	styleSelector(map);


	// ************************ adding boundary of Germany ***********************
	// this event is fired immediately after all necessary resources have been downloaded and the first visually complete rendering of the map has occurred
	map.on('load', function() {
		// resize map to full screen
		map.resize();
		// for a better orientation, add the boundary of germany to the map
		map.addLayer({
			'id': 'boundaryGermany',
			'type': 'line',
			'source': {
				'type': 'geojson',
				'data': boundaryGermany
			},
			'layout': {
				'line-join': 'round',
				'line-cap': 'round',
				'visibility': 'visible'
			},
			'paint': {
				'line-color': 'black',
				'line-width': 1
			}
		});
		customLayerIds.push('boundaryGermany');
		// *************************************************************************

		$("#severeWeather").click(function() {
			loadSevereWeather(map);
		});

		// set Interval to accumulate radar data for the animation
		window.setInterval(intervalRainRadar, paramArray.config.refresh_rate, map);


		// if there is an AOI given in the URL and because of a new page load in paramArray, then show it in map and do Tweet-search
		if (paramArray.aoi !== undefined) {
			getAndUseAOIFromURL(draw);
		}

		// ************************* load Rain Radar data **************************

		let rasterMenuToggle;
		let severeWeatherMenuToggle;

		if (readURL("wtype") == "radar") {

			// set the flag to radar
			wtypeFlag = "radar";

			// toggle the menu tabs for radar and severe weather to active or not active
			rasterMenuToggle = document.getElementById('raster');
			rasterMenuToggle.classList.toggle("active");
			severeWeatherMenuToggle = document.getElementById('severeWeather');
			severeWeatherMenuToggle.classList.remove("active");

			// TODO: hier auch readURL verwenden?
			// if rasterProduct is defined
			if (paramArray.rasterProduct !== undefined) {

				showLegend(map, "radar", paramArray.rasterProduct);

				// display rain radar
				requestAndDisplayAllRainRadar(map, paramArray.rasterProduct);

				// check the checkbox of the radar submenu according to the chosen product
				if (paramArray.rasterProduct === "ry") {
					var innerRasterCheckToggle1 = document.getElementById('radio1');
					innerRasterCheckToggle1.checked = true;
				}
				if (paramArray.rasterProduct === "rw") {
					let innerRasterCheckToggle2 = document.getElementById('radio2');
					innerRasterCheckToggle2.checked = true;
				}
				if (paramArray.rasterProduct === "sf") {
					var innerRasterCheckToggle3 = document.getElementById('radio3');
					innerRasterCheckToggle3.checked = true;
				}
			}
			// if radarproduct is undefined
			else {
				// default radar case (rw)
				showLegend(map, "radar", "rw");
				requestAndDisplayAllRainRadar(map, 'rw');
				updateURL("radProd", "rw");
				let innerRasterCheckToggle2 = document.getElementById('radio2');
				innerRasterCheckToggle2.checked = true;
			}
		}

		// ****************** load severe weather warnings data ********************

		if (readURL("wtype") === "unwetter") {

			deleteFromURL("radProd");

			// set the flag to severe weather
			wtypeFlag = "severeWeather";

			//create checkboxes for the submenu
			createWarningsCheckboxes(map);

			// toggle the menu tabs for radar and severe weather to active or not active
			rasterMenuToggle = document.getElementById('raster');
			rasterMenuToggle.classList.remove("active");
			severeWeatherMenuToggle = document.getElementById('severeWeather');
			severeWeatherMenuToggle.classList.add("active");

			showLegend(map, "unwetter");

			// elapsed milliseconds to last warnings request
			let msecsToLastUnwetterRequest = Date.now() - paramArray.config.timestamp_last_warnings_request;

			// if the timestamp of the last warnings request is null (no request so far) or equal to or older than "paramArray.config.refresh_rate" ...
			if ((paramArray.config.timestamp_last_warnings_request == null) || (msecsToLastUnwetterRequest >= paramArray.config.refresh_rate)) {
				// ... do a new warnings request right now ...
				requestNewAndDisplayCurrentUnwetters(map);
				// TODO: wird folgendes immer wieder ausgeführt, auch wenn Bedingung in if sich ändert?
				// ... and afterwards request warnings each "paramArray.config.refresh_rate" again
				requestNewAndDisplayCurrentUnwettersEachInterval(map, paramArray.config.refresh_rate);

				// if the last warnings request is less than "paramArray.config.refresh_rate" ago ...
			} else {

				let formattedTimestamp = timestampFormatting(paramArray.config.timestamp_last_warnings_request);
				let timestampLastRequest = document.getElementById("timestampLastRequest");
				timestampLastRequest.innerHTML = "<b>Timestamp of last DWD request:</b><br>" + formattedTimestamp;

				requestNewAndDisplayCurrentUnwetters(map);

				let timeUntilNextUnwetterRequest = paramArray.config.refresh_rate - msecsToLastUnwetterRequest;
				// ... do a new request in "timeUntilNextUnwetterRequest"-milliseconds ...
				window.setTimeout(requestNewAndDisplayCurrentUnwetters, timeUntilNextUnwetterRequest, map);
				// ... and afterwards each "paramArray.config.refresh_rate" again
				window.setTimeout(requestNewAndDisplayCurrentUnwettersEachInterval, (timeUntilNextUnwetterRequest + paramArray.config.refresh_rate), map, paramArray.config.refresh_rate);
			}
		}
	});
}


/**
* @desc Reads AOI-coordinates out of URL, makes a GeoJSON out of it and adds it to the given MapboxDraw.
* Then starts the tweet-search for this AOI.
* @author Katharina Poppinga
* @param {Object} draw - MapboxDraw-Object in which to add the AOI
*/
function getAndUseAOIFromURL(draw) {
	doneProcessingAOI = false;

	let aoiString = paramArray.aoi;

	// turning the AOI-String gotten from URL into the needed coordinates-array for adding it to mapbox-draw afterwards
	let restAoiString = "";
	let splittedAoiString = "";
	let long, lat;
	let pointArray = [];
	let polygonArray = [];

	restAoiString = aoiString.substring(1);
	splittedAoiString = restAoiString.split(",");

	// for-loop "over" coordinates that are contained in the AOI-String from URL
	// just loop until inclusively penultimate coordinate-pair
	for (let i = 0; i < splittedAoiString.length - 2; i = i + 2) {
		long = splittedAoiString[i].substring(1);
		lat = splittedAoiString[i+1].substring(0, splittedAoiString[i+1].length-1);
		long = JSON.parse(long);
		lat = JSON.parse(lat);
		pointArray.push(long, lat);
		polygonArray.push(pointArray);
		pointArray = [];
	}

	// adding last coordinate-pair to coordinates-array (different to previous ones because of two "]]" at the end)
	long = splittedAoiString[splittedAoiString.length-2].substring(1);
	lat = splittedAoiString[splittedAoiString.length-1].substring(0, splittedAoiString[splittedAoiString.length-1].length-2);
	long = JSON.parse(long);
	lat = JSON.parse(lat);
	pointArray.push(long, lat);
	polygonArray.push(pointArray);

	// add AOI to mapbox-draw-features and therefore into map
	draw.set({
		type: "FeatureCollection",
		features: [{
			type: "Feature",
			properties: {},
			id: "AOIfromURL",
			geometry: {
				type: 'Polygon',
				coordinates: [
					polygonArray
				]
			}
		}]
	});

	let aoiForTweetSearch = [polygonArray];
	onlyShowUnwetterAndTweetsInPolygon(map, turf.polygon(aoiForTweetSearch));
}



// ************************************* block about rain radar ****************************************

/**
* @desc This function requests and displays rain radar data in the given map.
* @author Katharina Poppinga, Paula Scharf, Benjamin Rieke, Jonathan Bahlmann
* @param {Object} map - the mapbox-map to display data in
* @param {String} product - the radar product, see API-Wiki on GitHub
*/
function requestAndDisplayAllRainRadar(map, product) {
	doneLoadingWeather = false;

	let currentTimestamp = Date.now();
	// is there a timestamp?
	if (typeof paramArray.timestamp === "undefined") {
		// none found, use just created "now"
	} else {
		// timestamp found from URL, than use this historic one
		currentTimestamp = JSON.parse(paramArray.timestamp) + (currentTimestamp - initTimestamp);
		try {
			Date.parse(currentTimestamp);
		} catch {
			console.log("The url is erroneous. Please try a different value for 'timestamp'.");
			currentTimestamp = Date.now();
		}
	}

	let timestampLastRequest = document.getElementById("timestampLastRequest");
	if (readURL("wtype") == "radar") {
		timestampLastRequest.innerHTML = "";
	}

	let url = "/api/v1/radar/" + product + "/" + currentTimestamp;

	// update the status display
	$('#information').html("Retrieving the requested " + product + " rain radar product.");

	// Rain Radar Data
	$.getJSON(url, function(result) {

		// ***************************************************************************************************************
		// for displaying the radar stuff only in the map for radar and not in the map for severe weather warnings
		if (readURL("wtype") == "radar") {

			// show timestamp of current radar data in legend
			let formattedDataTimestamp = timestampFormatting(result.timestamp);
			let dataTimestamp = document.getElementById("dataTimestamp");
			dataTimestamp.innerHTML = "<b>Timestamp of data:</b><br>" + formattedDataTimestamp;

			// if the radar data shown are no demodata
			if (currentTimestamp > paramArray.config.demo.timestamp_end) {
				// show timestamp of the last request in legend
				let formattedRequestTimestamp = timestampFormatting(result.timestampOfRequest);
				timestampLastRequest.innerHTML = "<b>Timestamp of last DWD request:</b><br>" + formattedRequestTimestamp;
			}

			// ***************************************************************************************************************

			//see if layer needs to be updated or added
			let sourceObject = map.getSource("rainradar");
			// if there is already an existing Source of this map with the given layerID ...
			if (typeof sourceObject !== 'undefined') {
				// reset data
				sourceObject.setData(result.geometry);
				//if data is not yet in map
			} else {
				// display
				map.addSource("rainradar", {
					"type": "geojson",
					"data": result.geometry
				});

				map.addLayer({
					"id": "rainradar",
					"type": "fill",
					"source": "rainradar",
					"layout": {"visibility": "visible"},
					"paint": {
						"fill-color" : {
							"property": "class",
							"stops": [
								[1, '#b3cde0'],
								[2, '#6497b1'],
								[3, '#03396c'],
								[4, '#011f4b']
							]
						},
						"fill-opacity": 0.4
					}
				});
				customLayerIds.push('rainradar');
			}
		}
		doneLoadingWeather = true;
	});
}


/**
* @desc Sets a timeout for the start of the radar-requesting routine.
* @author Jonathan Bahlmann
* @param {Object} map - the mapbox-map to display data in
*/
function intervalRainRadar(map) {
	let refresh = paramArray.config.refresh_rate;
	let prod;
	// if refresh-rate < 1 hour
	if(refresh < 3600000) {
		prod = "ry";
	} else {
		prod = "rw";
	}

	// pause for 20sec
	window.setTimeout(callRainRadar, 20000, map, prod);
}


/**
* @desc Callback for timeout. Handles the API call and updates map if necessary.
* @author Jonathan Bahlmann
* @param {Object} map - the mapbox-map to display data in
* @param {String} prod - the radar product, see API-Wiki on GitHub
*/
function callRainRadar(map, prod) {
	doneLoadingWeather = false;

	// progress update info
	$('#information').html("Retrieving the requested " + prod + " rain radar data.");

	// is there a timestamp?
	let currentTimestamp = Date.now();
	if(typeof paramArray.timestamp === "undefined") {
		// none found, create "now"
		currentTimestamp = Date.now();
	} else {
		// found, use historic one
		currentTimestamp = JSON.parse(paramArray.timestamp) + (currentTimestamp - initTimestamp);
		try {
			Date.parse(currentTimestamp);
		} catch {
			console.log("The url is erroneous. Please try a different value for 'timestamp'.")
			currentTimestamp = Date.now();
		}
	}

	// make call
	let url = "/api/v1/radar/" + prod + "/" + currentTimestamp;
	$.getJSON(url, function(result) {
		console.log("Automatically requested new rain radar data.");
		// read from url
		let wtype = readURL("wtype");
		let urlProd = readURL("radProd");
		// if radar is currently shown, update the map
		if(wtype == "radar" && urlProd == prod) {

			// TODO hier evtl display modularisieren um nicht noch ein request zu machen
			requestAndDisplayAllRainRadar(map, prod);
		} else {
			doneLoadingWeather = true;
		}
	});
}
// *****************************************************************************************************


/**
* @desc Arranges new severe weather warnings requests each given interval
* and shows the retrieved warnings in given map.
* @private
* @author Katharina Poppinga
* @param {Object} map - mapbox-map in which to display the current warnings
* @param {number} interval - timestamp in Epoch milliseconds, each of these a new warnings request will start
*/
function requestNewAndDisplayCurrentUnwettersEachInterval(map, interval) {
	window.setInterval(requestNewAndDisplayCurrentUnwetters, interval, map);
}



/**
* @desc Requests severe weather warnings from DWD or out of database (depending on former requests).
* Shows them in the given map.
* @author Katharina Poppinga, Paula Scharf
* @param {Object} map - mapbox-map in which to display the current warnings
*/
function requestNewAndDisplayCurrentUnwetters(map) {
	doneLoadingWeather = false;

	// timestamp (in Epoch milliseconds) for this whole specific request
	// if there is a timestamp given in the paramArray, take it, if not then create Date.now()
	let currentTimestamp = (paramArray.timestamp) ? paramArray.timestamp : Date.now();

	// for demo data
	if (paramArray.config.current_time && paramArray.config.current_time !== null) {
		currentTimestamp = paramArray.config.current_time + (currentTimestamp - initTimestamp);
		try {
			Date.parse(currentTimestamp);
		} catch {
			console.log("The config.yaml is erroneous. Please try a different value for 'current_time'.");
			currentTimestamp = Date.now();
		}
	}

	$('#information').html("Retrieving the requested severe weather warnings.");

	$.ajax({
		// use a http GET request
		type: "GET",
		// URL to send the request to
		url: "/api/v1/warnings/" + currentTimestamp,
		// type of the data that is sent to the server
		contentType: "application/json; charset=utf-8",
		// timeout set to 15 seconds
		timeout: 15000
	})

	// if the request is done successfully, ...
	.done(function (result) {
		// ... give a notice on the console that the AJAX request for reading current warnings has succeeded
		console.log("AJAX request (reading current warnings) is done successfully.");

		// for displaying the warnings stuff only in the map for severe weather warnings and not in the map for radar data
		if (readURL("wtype") == "unwetter") {

			let timestampLastRequest = document.getElementById("timestampLastRequest");

			// if the warnings shown are no demodata
			if (currentTimestamp > paramArray.config.demo.timestamp_end) {
				// display the timestamp of the last request in the legend
				let formattedTimestamp = timestampFormatting(
					// if following expression is true, then take 'currentTimestamp'; if false then take the timestamp_last_warnings_request
					((currentTimestamp - paramArray.config.timestamp_last_warnings_request) >= paramArray.config.refresh_rate) ?
					currentTimestamp : paramArray.config.timestamp_last_warnings_request);

					timestampLastRequest.innerHTML = "<b>Timestamp of last DWD request:</b><br>" + formattedTimestamp;
				}
				// if the warnings shown are demodata
				else {
					// TODO: eher im Code nötig, direkt wenn Legende eingeladen wird, aber wie dann an currentTimestamp kommen??
					timestampLastRequest.innerHTML = "";

					let posAccuracy = document.getElementById("posAccuracy");
					posAccuracy.innerHTML = "<b>Positional accuracy of data:</b><br>Local authority borders<br>(does not count for all demodata)";
				}

				displayCurrentUnwetters(map, result.events);
			}

			map.fire('draw.reloadTweets', {});
			doneLoadingWeather = true;
		})

		// if the request has failed, ...
		.fail(function (xhr, status, error) {
			// ... give a notice that the AJAX request for reading current warnings has failed and show the error on the console
			console.log("AJAX request (reading current warnings) has failed.", error);

			// send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
			if (error === "timeout") {
				JL("ajaxReadingWarningsTimeout").fatalException("ajax: '/warnings/test/currentTimestamp' timeout");
			}
			else {
				JL("ajaxReadingWarningsError").fatalException(error);
			}
		});
	}



	/**
	* @desc Shows given warnings in given map.
	* Creates checkboxes in menu for showing only certain types of
	* warnings ("Rain", "Snowfall", "Thunderstorm" or "BlackIce").
	* @author Katharina Poppinga, Paula Scharf, Benjamin Rieke
	* @param {Object} map - mapbox-map in which to display the current warnings
	* @param {Array} currentUnwetters -
	*/
	function displayCurrentUnwetters(map, currentUnwetters) {

		// one feature for a warning (could be heavy rain, light snowfall, ...)
		let warningsFeatureCollection;

		// remove layer and source of those warnings which are expired from map and remove its layerID from customLayerIds
		findAndRemoveOldLayerIDs(map, currentUnwetters);

		// iteration over all warnings in the database
		for (let i = 0; i < currentUnwetters.length; i++) {

			let currentUnwetterEvent = currentUnwetters[i];
			let searchWords = [];
			let layerGroup = "";
			let ii = currentUnwetterEvent.properties.ec_ii;
			// choose the correct group identifier for the warning and set the searchwords for the tweetrequest accordingly:

			// if the current warning is of type RAIN ...
			if ((ii >= 61) && (ii <= 66)) {
				layerGroup = "Rain";
				searchWords.push("Starkregen", "Dauerregen");
			}
			// if the current warning is of type SNOWFALL ...
			else if ((ii >= 70) && (ii <= 78)) {
				layerGroup = "Snowfall";
				searchWords.push("Schneefall");
			}
			// if the current warning is of type THUNDERSTORM ..
			else if (((ii >= 31) && (ii <= 49)) || ((ii >= 90) && (ii <= 96))) {
				layerGroup = "Thunderstorm";
				searchWords.push("Gewitter");
			}
			// if the current warning is of type BLACK ICE ..
			else if ((ii === 24) || ((ii >= 84) && (ii <= 87))) {
				layerGroup = "BlackIce";
				searchWords.push("Blitzeis", "Glätte", "Glatteis");
			}
			else {
				// TODO: if-else if ohne else möglich??
			}

			//
			for (let i = 0; i < currentUnwetterEvent.geometry.length; i++) {
				let currentPolygon = currentUnwetterEvent.geometry[i];
				// make a GeoJSON-FeatureCollection out of the current warnings
				warningsFeatureCollection = {
					"type": "FeatureCollection",
					"features": [{
						"type": "Feature",
						"geometry": currentPolygon,
						"properties": currentUnwetterEvent.properties
					}]
				};
				warningsFeatureCollection.features[0].properties.searchWords = searchWords;

				//
				displayEvent(map, "unwetter " + layerGroup.replace(/\s/g, '') + " " + currentUnwetterEvent.dwd_id.replace(/\s/g, '') + " " + i, warningsFeatureCollection);
			}
		}
	}



	/**
	* @desc Makes a mapbox-layer out of all given events. Sets its layerID to the given one.
	* Displays the layers events in the map. Colors the created layer by type-attribute.
	* @author Katharina Poppinga, Benjamin Rieke, Paula Scharf
	* @private
	* @param {Object} map - mapbox-map in which to display the layers events
	* @param {String} layerID ID for the map-layer to be created
	* @param {Object} eventFeatureCollection GeoJSON-FeatureCollection of events to show in map
	*/
	function displayEvent(map, layerID, eventFeatureCollection) {

		let sourceObject = map.getSource(layerID);

		// if there is already an existing Source of this map with the given layerID ...
		if (typeof sourceObject !== 'undefined') {
			// ... set the data
			let data = JSON.parse(JSON.stringify(sourceObject._data));
			data.features = eventFeatureCollection.features;
			sourceObject.setData(data);

			// if there is no Source of this map with the given layerID ...
		} else {
			// ... add the given eventFeatureCollection withits given layerID as a Source to the map (and add it afterwards as a Layer to the map)
			map.addSource(layerID, {
				type: 'geojson',
				data: eventFeatureCollection
			});

			// layer-adding for a Tweet with a point-geometry
			if (eventFeatureCollection.features[0].geometry.type === "Point") {
				map.addLayer({
					"id": layerID,
					"type": "symbol",
					"source": layerID,
					"layout": {
						"icon-image": ["concat", "circle", "-15"],
						"visibility" : "visible"
					}
				});

				// Layer-adding for warnings with a polygon-geometry
			} else {
				// add the given warnings as a layer to the map
				map.addLayer({
					"id": layerID,
					"type": "fill",
					"source": layerID,
					"layout": {"visibility": "visible"},
					"paint": {
						"fill-color": [
							"match", ["string", ["get", "ec_ii"]],
							"24", // black ice
							"yellow",
							"84",
							"yellow",
							"85",
							"yellow",
							"87",
							"yellow",
							"31", // thunderstorm
							"red",
							"33",
							"red",
							"34",
							"red",
							"36",
							"red",
							"38",
							"red",
							"40",
							"red",
							"41",
							"red",
							"42",
							"red",
							"44",
							"red",
							"45",
							"red",
							"46",
							"red",
							"48",
							"red",
							"49",
							"red",
							"90",
							"red",
							"91",
							"red",
							"92",
							"red",
							"93",
							"red",
							"95",
							"red",
							"96",
							"red",
							"61", // rain
							"blue",
							"62",
							"blue",
							"63",
							"blue",
							"64",
							"blue",
							"65",
							"blue",
							"66",
							"blue",
							"70", // snowfall
							"darkviolet",
							"71",
							"darkviolet",
							"72",
							"darkviolet",
							"73",
							"darkviolet",
							"74",
							"darkviolet",
							"75",
							"darkviolet",
							"76",
							"darkviolet",
							"77",
							"darkviolet",
							"78",
							"darkviolet",
							"black" // other events
						],
						"fill-opacity": 0.3
					}
				});
			}

			makeLayerInteractive(map, layerID);
			createWarningsCheckboxes(map);
			customLayerIds.push(layerID);
		}
	}


	// TODO: JSDoc
	/**
	* @desc Takes an Array of warnings-Objects and checks wether they are expired or not.
	* If they are expired, removes them from given map. ??
	findAndRemoveOldLayerIDs from customLayerIds and remove jeweiligen layer und source aus map
	* ...............................
	* @author Katharina Poppinga
	* @private
	* @param {Object} map - mapbox-map from which to remove the given warnings
	* @param {Array} currentUnwetters -
	*/
	function findAndRemoveOldLayerIDs(map, currentUnwetters){

		// Array in which the layerIDs of the warnings which shall not longer be displayed in the map will be collected (for deleting them from Array customLayerIds afterwards)
		let layerIDsToRemove = [];

		// iteration over all elements (all layerIDs) in Array customLayerIds
		for (let i = 0; i < customLayerIds.length; i++) {

			let layerID = customLayerIds[i];

			// split the String of the layerID by space for getting the type Unwetter and the dwd_ids as isolated elements
			let layerIdParts = layerID.split(/[ ]+/);

			// layerIdParts[0] contains the type of layer-element
			if (layerIdParts[0] === "unwetter") {

				// default false stands for: layer-warning is not (no longer) a current warning
				let isCurrent = false;
				//
				for (let j = 0; j < currentUnwetters.length; j++) {

					// layerIdParts[2] contains the id (here: dwd_id for warnings)
					// if the layer-warning is still a current warning, set "isCurrent" to true
					if (layerIdParts[2] === currentUnwetters[j].dwd_id) {
						isCurrent = true;
					}
				}

				// TODO: paula geändert???
				// if the layer-warning is not (no longer) a current warning, remove its ID from customLayerIds
				if (isCurrent === false) {
					showAllExcept(map, layerIdParts[2]);

					// removes 1 element at index i from Array customLayerIds
					customLayerIds.splice(i, 1);

					// for not omitting one layerID in this for-loop after removing one
					i--;
				}
			}
		}
	}


	/**
	* @desc
	* @author Paula Scharf, Jonathan Bahlmann
	* @param polygon a turf polygon (aoi)
	*/
	function onlyShowRainRadarAndTweetsInPolygon(map, polygon) {
		// so polygon is the turf - aoi
		// we want to search for tweets in the aoi

		// timestamp thingy by Paula **************************************************************
		let currentTimestamp = Date.now();
		if(typeof paramArray.timestamp === "undefined") {
			// none found, create "now"
			currentTimestamp = Date.now();
		} else {
			// found, use historic one
			currentTimestamp = JSON.parse(paramArray.timestamp) + (currentTimestamp - initTimestamp);
			try {
				Date.parse(currentTimestamp);
			} catch {
				console.log("The url is erroneous. Please try a different value for 'timestamp'.")
				currentTimestamp = Date.now();
			}
		}

		// testing a couple things
		let layer = map.getSource("rainradar");
		layer = layer._data.features;

		// make MultiPolygon Geometry
		let multiPol = polygon.geometry.coordinates;
		multiPol = [multiPol];
		let geom = {
			"type": "MultiPolygon",
			"coordinates": multiPol
		};

		// ****************************************************************************************
		// make query
		// TODO: searchWords anpassen
		let searchWords = ["rain", "Regen", "Unwetter", "Gewitter", "Sinnflut", "regnet", "Feuerwehr", "Sturm", "Flut", "Starkregen"];
		let query = {
			twitterSearchQuery: {
				// TODO which geometry is correct here
				geometry: geom, //polygon.geometry,  //.coordinates,
				searchWords: searchWords
			},
			dwd_id: "rainRadar",
			currentTimestamp: currentTimestamp
		};

		// send query
		$.ajax({
			// use a http POST request
			type: "POST",
			// URL to send the request to
			url: "/api/v1/twitter/tweets",
			// type of the data that is sent to the server
			contentType: "application/json; charset=utf-8",
			// data to send to the server
			data: JSON.stringify(query),
			// timeout set to 15 seconds
			timeout: 15000,
			// update the status display
			success: function() {
				$('#information').html("Trying to find and insert fitting tweets");
			}
		})
		// now what
		.done(function(result) {
			// result is our tweets that lie in the aoi
			console.log("AJAX request (finding and inserting tweets) is done successfully.");

			// if response is valid
			if(typeof result !== "undefined" && result.statuses.length > 0) {
				try {
					// idk what this is doing
					let turfPolygon = turf.polygon(polygon.geometry.coordinates);
					// create an empty featurecollection for the tweets
					let tweetFeatureCollection = {
						"type": "FeatureCollection",
						"features": []
					};
					// add the tweets in the result to the featurecollection
					// go through all tweets that we got
					result.statuses.forEach(function (item) {
						// with a valid tweet
						if (item.id && item.location_actual !== null) {
							// do the check with radar geometry
							// search with turf.pointsWithinPolygon
							// create turf.points und turf.polygon

							let tweetLocation = turf.point(item.location_actual.coordinates);
							let rainRadarLayer = map.getSource("rainradar");
							// create a boolean
							let bool = false;
							for(let i = 0; i < rainRadarLayer._data.features.length; i++) {
								console.log(rainRadarLayer._data.features[i]);
								let rainRadarPolygon = turf.polygon(rainRadarLayer._data.features[i].geometry.coordinates);
								// if the point lies in any of these rainRadar polygons, set bool true
								if(turf.booleanPointInPolygon(tweetLocation, rainRadarPolygon)) {
									bool = true;
								}
							}

							// if bool is true, displayEvent()

							//if(bool) {
							let tweetFeature = {
								"type": "Feature",
								"geometry": item.location_actual,
								"properties": item
							};
							tweetFeatureCollection.features = [tweetFeature];
							displayEvent(map, "tweet rainradar", tweetFeatureCollection);
							//}

						}
					});
				} catch (e) {
					console.dir("There was an error while processing the tweets from the database", e);
					// TODO: error catchen und dann hier auch den error ausgeben?
				}
			}
			doneProcessingAOI = true;
		})

		// if the request has failed, ...
		.fail(function(xhr, status, error) {
			// ... give a notice that the AJAX request for finding and inserting tweets has failed and show the error on the console
			console.log("AJAX request (finding and inserting tweets) has failed.", error);

			// send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
			if (error === "timeout") {
				JL("ajaxRetrievingTweetsTimeout").fatalException("ajax: '/Twitter/tweets' timeout");
			}
			else {
				JL("ajaxRetrievingTweetsError").fatalException(error);
			}
			doneProcessingAOI = true;
		});

		// TODO: ???  and then check whether they lie in the rainRadar polygons
	}


	/**
	* @desc This function makes only warnings and its tweets visible, if the include a polygon that is fully contained by the given
	* polygon.
	* Attention: Turf is very inaccurate.
	* @author Paula Scharf
	* @param {Object} map mapbox-map
	* @param polygon - a turf polygon (e.g. the AOI)
	*/
	function onlyShowUnwetterAndTweetsInPolygon(map, polygon) {

		let requests = [];
		for (let i = 0; i<customLayerIds.length; i++) {
			let layerID = customLayerIds[i];
			// make sure to only check layers which contain a warning
			if (layerID.includes("unwetter")) {
				let isInAOI = false;
				let source = map.getSource(layerID);
				// if any polygon of the layer is not contained by the given polygon, it is not inside the AOI
				source._data.features[0].geometry.coordinates[0].forEach(function (item) {
					let coordinateArray = [item];
					let currentlayerPolygon = turf.polygon(coordinateArray);
					if (turf.booleanContains(polygon, currentlayerPolygon) &&
					(typeof turf.intersect(polygon, currentlayerPolygon) !== 'undefined')) {
						isInAOI = true;
					}
				});
				// change visibility of corresponding tweet layer
				let layerIDSplit = layerID.split(/[ ]+/);

				let visibility;
				// decide if the warning is gonna be visible or not
				if (!isInAOI) {
					visibility = 'none';
				} else {
					visibility = 'visible';
					// is there a timestamp?
					let currentTimestamp = Date.now();
					if (typeof paramArray.timestamp === "undefined") {
						// none found, create "now"
						currentTimestamp = Date.now();
					} else {
						// found, use historic one
						currentTimestamp = JSON.parse(paramArray.timestamp) + (currentTimestamp - initTimestamp);
						try {
							Date.parse(currentTimestamp);
						} catch {
							console.log("The url is erroneous. Please try a different value for 'timestamp'.")
							currentTimestamp = Date.now();
						}
					}

					let query = {
						query: {
							twitterSearchQuery: {
								geometry: source._data.features[0].geometry,
								searchWords: source._data.features[0].properties.searchWords
							},
							dwd_id: layerIDSplit[2],
							currentTimestamp: currentTimestamp
						},
						layerIDSplit1: layerIDSplit[1]
					}
					requests.push(query);
				}
				// change visibility of warning layer
				map.setLayoutProperty(layerID, 'visibility', visibility);

				let layerIDTweet = "tweet " + layerIDSplit[1] + " " + layerIDSplit[2];
				let tweetLayer = map.getLayer(layerIDTweet);

				if (typeof tweetLayer !== 'undefined') {
					map.setLayoutProperty(layerIDTweet, 'visibility', visibility);
				}
			}
		}
		for (let i = 0; i < requests.length; i++) {
			let query = requests[i].query;
			$.ajax({
				// use a http POST request
				type: "POST",
				// URL to send the request to
				url: "/api/v1/twitter/tweets",
				// type of the data that is sent to the server
				contentType: "application/json; charset=utf-8",
				// data to send to the server
				data: JSON.stringify(query),
				// timeout set to 15 seconds
				timeout: 15000,
				// update the status display
				success: function () {
					$('#information').html("Trying to find and insert fitting tweets");
				}
			})

			// if the request is done successfully, ...
			.done(function (result) {
				// ... give a notice on the console that the AJAX request for finding and inserting tweets has succeeded
				console.log("AJAX request (finding and inserting tweets) is done successfully.");
				if (typeof result !== "undefined" && result.statuses.length > 0) {
					try {
						let turfPolygon = turf.polygon(polygon.geometry.coordinates);
						// create an empty featurecollection for the tweets
						let tweetFeatureCollection = {
							"type": "FeatureCollection",
							"features": []
						};
						// add the tweets in the result to the featurecollection
						result.statuses.forEach(function (item) {
							if (item.id && item.location_actual !== null) {
								let tweetLocation = turf.point(item.location_actual.coordinates);
								if (turf.booleanPointInPolygon(tweetLocation, turfPolygon)) {
									let tweetFeature = {
										"type": "Feature",
										"geometry": item.location_actual,
										"properties": item
									};
									tweetFeatureCollection.features = [tweetFeature];
									displayEvent(map, "tweet " + item.idstr.replace(/\s/g, '') + " " + requests[i].layerIDSplit1.replace(/\s/g, '') + " " + query.dwd_id.replace(/\s/g, ''), tweetFeatureCollection);
								}
							}
						});
					} catch (e) {
						console.dir("There was an error while processing the tweets from the database:", e);
						console.log(e);
					}
				}
				if (i >= requests.length - 1) {
					doneProcessingAOI = true;
				}
			})

			// if the request has failed, ...
			.fail(function (xhr, status, error) {
				// ... give a notice that the AJAX request for finding and inserting tweets has failed and show the error on the console
				console.log("AJAX request (finding and inserting tweets) has failed.", error);

				// send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
				if (error === "timeout") {
					JL("ajaxRetrievingTweetsTimeout").fatalException("ajax: '/Twitter/tweets' timeout");
				}
				else {
					JL("ajaxRetrievingTweetsError").fatalException(error);
				}
				if (i >= requests.length - 1) {
					doneProcessingAOI = true;
				}
			});
		}
		if (requests.length < 1) {
			doneProcessingAOI = true;
		}
	}


	/**
	* @desc This function ensures that all warnings but no tweets are visible.
	* @author Paula Scharf
	* @param {Object} map - mapbox-map
	* @param {String} keyword -
	*/
	function showAllExcept(map, keyword) {

		for (let i = 0; i<customLayerIds.length; i++) {
			let layerID = customLayerIds[i];
			if(layerID.includes(keyword)) {
				map.removeLayer(layerID);
				map.removeSource(layerID);
				customLayerIds.remove(layerID);
				if(layerID.includes("tweet") && document.getElementById(layerID.split(/[ ]+/)[1])) {
					closeAllPopups();
				}
				i--;
			} else {
				map.setLayoutProperty(layerID, 'visibility', 'visible');
			}
		}
	}


	/**
	* @desc Calls a given function (cb) for all layers of the map.
	* @author Paula Scharf
	* @param {Object} map mapbox-map
	* @param cb - function to perform for each layer
	*/
	function forEachLayer(map, cb) {

		map.getStyle().layers.forEach((layer) => {
			if (!customLayerIds.includes(layer.id)) return;

			cb(layer);
		});
	}



	/**
	* @desc Takes a timestamp in Epoch milliseconds makes a Date-String out of it.
	* @author Katharina Poppinga
	* @private
	* @param {number} timestamp - timestamp in Epoch milliseconds
	* @returns {String} formatted timestamp for displaying in browser
	*/
	function timestampFormatting(timestamp) {

		let timestampDate = new Date(timestamp);
		let splittedTimestamp = timestampDate.toString().split("(");
		return (splittedTimestamp[0]);
	}


	/**
	* @desc
	* @author Paula Scharf
	* @param {Object} map mapbox-map
	* @param {} id
	*/
	function deleteTweet(map, id, popup) {

		let query = {
			idstr: id
		};

		$.ajax({
			// use a http DELETE request
			type: "DELETE",
			// URL to send the request to
			url: "/api/v1/twitter/tweet",
			// type of the data that is sent to the server
			contentType: "application/json; charset=utf-8",
			// data to send to the server
			data: JSON.stringify(query),
			// timeout set to 15 seconds
			timeout: 15000,
			// update the status display
			success: function() {
				$('#information').html("Deleting a tweet");
			}
		})

		// if the request is done successfully, ...
		.done(function () {
			// ... give a notice on the console that the AJAX request for deleting a tweet has succeeded
			console.log("AJAX request (deleting a tweet) is done successfully.");

			showAllExcept(map, "tweet " + id);
			popup.remove();
		})

		// if the request has failed, ...
		.fail(function (xhr, status, error) {
			// ... give a notice that the AJAX request for deleting a tweet has failed and show the error on the console
			console.log("AJAX request (deleting a tweet) has failed.", error);

			// send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
			if (error === "timeout") {
				JL("ajaxDeletingTweetTimeout").fatalException("ajax: '/twitter/tweet' timeout");
			}
			// TODO: testen, ob so richtig
			else {
				JL("ajaxDeletingTweetError").fatalException(error);
			}
		});
	}


	/**
	* @desc
	* @author Paula Scharf
	* @param {Object} map - mapbox-map
	*/
	function filterTweets(map) {

		let textarea = document.getElementById("tweetfilter-ta");
		filterwords = textarea.value.split("\n");
		filterTweetPopups(map);
	}


	/**
	* @desc
	* @author Paula Scharf
	* @param {Object} map - mapbox-map
	*/
	function filterTweetPopups(map) {

		customLayerIds.forEach(function(id) {
			if (id.includes("tweet")) {
				let tweet = map.getSource(id);
				let visibility = 'none'
				filterwords.forEach(function(phrase) {
					if (tweet._data.features[0].properties.statusmessage.includes(phrase)) {
						visibility = 'visible';
					}
				});
				map.setLayoutProperty(id, 'visibility', visibility);
			}
		})
	}


	/**
	* @desc Closes all mapbox popups.
	* @author Paula Scharf
	*/
	function closeAllPopups() {
		let elements = document.getElementsByClassName("mapboxgl-popup");
		for (let i = 0; i < elements.length; i++) {
			elements[i].parentNode.removeChild(elements[i]);
		}
	}


	/**
	* @desc Removes an element from an array based on its content.
	* @returns {Array}
	*/
	Array.prototype.remove = function() {
		var what, a = arguments, L = a.length, ax;
		while (L && this.length) {
			what = a[--L];
			while ((ax = this.indexOf(what)) !== -1) {
				this.splice(ax, 1);
			}
		}
		return this;
	};
