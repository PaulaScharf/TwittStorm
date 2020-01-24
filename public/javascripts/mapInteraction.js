// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/



/**
* @desc Creates and shows a legend for the given map and given type of data.
* Contains information about different layers in map, their source and corrsponding timestamps.
* @author Katharina Poppinga
* @param {Object} map - mapbox-map for and in which to display the legend
* @param {String} typeOfData - "unwetter" or "radar"
* @param {String} product - type of rain radar: "ry", "rw" or "sf"
*/
function showLegend(map, typeOfData, product) {

	// first remove some old DOM elements
	while (legend.hasChildNodes()) {
		legend.removeChild(legend.firstChild);
	}


	let paraTypeOfData = document.createElement("p"); // create a html-paragraph
	paraTypeOfData.id = "typeOfData"; // set ID of the html-paragraph
	legend.appendChild(paraTypeOfData);

	let values = [];
	let colors = [];
	let dataSource = document.getElementById("dataSource");
	let dataTimestamp = document.getElementById("dataTimestamp");
	let timestampLastRequest = document.getElementById("timestampLastRequest");
	let refreshRate = document.getElementById("refreshRate");
	let posAccuracy = document.getElementById("posAccuracy");


	// ******************************* legend for warnings *******************************
	if (typeOfData === "unwetter") {

		// set titel of legend
		paraTypeOfData.innerHTML = "<b>Severe weather</b>";
		// set info for data timestamps
		dataTimestamp.innerHTML = "<b>Timestamp of data:</b><br>Differs for each warning,<br>see popups in map.";
		// set positional accuracy
		posAccuracy.innerHTML = "<b>Positional accuracy of data:</b><br>Local authority borders";

		values = ["Rain", "Snowfall", "Thunderstorm", "Black ice"]
		colors = ["blue", "darkviolet", "red", "yellow"];
	}

	// ****************************** legend for rain radar ******************************
	if (typeOfData === "radar") {

		// set titel of legend
		paraTypeOfData.innerHTML = "<b>Depth of precipitation</b>";

		let productType = document.createElement("p"); // create a html-paragraph
		productType.id = "productType"; // set ID of the html-paragraph
		paraTypeOfData.appendChild(productType);

		dataTimestamp.innerHTML = "<b>Timestamp of data:</b><br>";
		posAccuracy.innerHTML = "<b>Positional accuracy of data:</b><br>1 km x 1 km";

		let classes = [];
		// last value of last class is not needed, it is just any much to big value for including all bigger values than in the three lower classes

		switch (product) {
			case (product = "ry"): // 5 min
			productType.innerHTML = "Rain radar product type:<br><b>Sum of 5 min (RY)</b>";
			classes = [[0,0.01,1],[0.01,0.034,2],[0.034,0.166,3],[0.166,10000,4]];
			break;
			case (product = "rw"): // 60 min
			productType.innerHTML = "Rain radar product type:<br><b>Sum of 60 min (RW)</b>";
			classes = [[0,0.25,1],[0.25,1,2],[1,5,3],[5,10000,4]];
			break;
			case (product = "sf"): // 24 h
			productType.innerHTML = "Rain radar product type:<br><b>Sum of 24 h (SF)</b>";
			classes = [[0,6,1],[6,24,2],[24,120,3],[120,10000,4]];
			break;
		}

		values = [("> " + classes[0][0] + " mm to " + classes[0][1] + " mm"), ("> " + classes[1][0] + " mm to " + classes[1][1] + " mm"), ("> " + classes[2][0] + " mm to " + classes[2][1] + " mm"), ("> " + classes[3][0] + " mm")];
		colors = ["#b3cde0", "#6497b1", "#03396c", "#011f4b"];
	}


	// ****************************** legend for both ******************************

	let l;
	// for-loop over every element-pair (value and color) for the legend
	for (l = 0; l < values.length; l++) {
		let legendElements = document.createElement('div');
		legendElements.id = "legendElements";

		let colorKey = document.createElement('span');
		colorKey.className = 'colorKey';
		colorKey.style.backgroundColor = colors[l];

		let value = document.createElement('span');
		value.innerHTML = values[l];

		legendElements.appendChild(colorKey);
		legendElements.appendChild(value);
		legend.appendChild(legendElements);
	}

	// image taken from: https://upload.wikimedia.org/wikipedia/de/thumb/7/7b/DWD-Logo_2013.svg/800px-DWD-Logo_2013.svg.png
	dataSource.innerHTML = "<b>Data source:</b><br><img id='DWD_Logo' src='../css/DWD-Logo_2013.svg' alt='Deutscher Wetterdienst'>";
	let refreshRateValue = paramArray.config.refresh_rate;
	refreshRate.innerHTML = "<b>Refresh rate:</b><br>" + refreshRateValue + " ms  (&#8773 " + msToMin(refreshRateValue) + " min)";
}



/**
* @desc
* @author https://stackoverflow.com/questions/21294302/converting-milliseconds-to-minutes-and-seconds-with-javascript
* @param {number} ms - milliseconds which will be converted to minutes
* @returns {number} minutes
*/
function msToMin(ms) {
	var min = Math.floor(ms / 60000);
	var sec = ((ms % 60000) / 1000).toFixed(0);
	return min + ":" + (sec < 10 ? '0' : '') + sec;
}



/**
* @desc Pans the given map into the given direction.
* Pan-width depends on zoom level of map.
* @author Katharina Poppinga
* @param {Object} map - mapbox-map to pan
* @param {String} directionToPan - the direction in which the map to pan: "left", "right", "up" or "down"
*/
function panMapWithButton(map, directionToPan) {

	let center = map.getCenter();
	let newCenter;

	let panLong = 160 * Math.pow(0.51, map.getZoom());
	let panLat = 90 * Math.pow(0.51, map.getZoom());

	switch (directionToPan) {
		case (directionToPan = "left"):
		newCenter = [center.lng - panLong, center.lat];
		break;
		case (directionToPan = "right"):
		newCenter = [center.lng + panLong, center.lat];
		break;
		case (directionToPan = "up"):
		newCenter = [center.lng, center.lat + panLat];
		break;
		case (directionToPan = "down"):
		newCenter = [center.lng, center.lat - panLat];
		break;
	}
	map.panTo(newCenter);
}



/**
* @desc Zoom given map to the given coordinates.
* @author https://gist.github.com/aerispaha/826a9f2fbbdf37983dc01e6074ce7cd7
* @param {Object} map - mapbox-map
* @param coordinates
*/
function zoomToCoordinates(map, coordinates) {

	// Pass the first coordinates in the Polygon to `lngLatBounds` &
	// wrap each coordinate pair in `extend` to include them in the bounds
	// result. A variation of this technique could be applied to zooming
	// to the bounds of multiple Points or Polygon geomteries - it just
	// requires wrapping all the coordinates with the extend method.
	let bounds = coordinates.reduce(function(bounds, coord) {
		return bounds.extend(coord);
	}, new mapboxgl.LngLatBounds([coordinates[0], coordinates[0]]));

	map.fitBounds(bounds, {
		padding: 20
	});

	let center = map.getCenter();
	let centerString = "[" + center.lng + "," + center.lat + "]";
	updateURL('mapCenter', centerString);
}



// TODO: wie passt folgende Funktion zum openMenu(this, productMenu, animationMap) -Aufruf in animation.ejs ?????
/**
* @desc Opens and closes the menu for the selection of the routes and changes the button to an X
* @author Benjamin Rieke
* @param {HTML-element} button - links the button to the function
* @param {HTML-element-ID} menu - ID of the menu that is supposed to open/close
* @param {String} site - the requested site index or animation
* @param {Object} map - mapbox-map
*/
function openMenu(button, menu, site) {

	// if a radar product is selected automatically open up the radar submenu
	if (site == 'index') {

		if (wtypeFlag == "radar") {
			var innerRasterMenuToggle = document.getElementById('rasterMenu');
			innerRasterMenuToggle.style.display = "block";
		}
		// if severe weather is selected automatically open up the severe weather submenu
		else {
			var innerUnwetterMenuToggle = document.getElementById('menu');
			innerUnwetterMenuToggle.style.display = "block";
		};
	}

	// displays the germany boundary button if is not visible
	var boundaryButtonToggle = document.getElementById('germanyButton');
	if (boundaryButtonToggle.style.display === "none"){
		boundaryButtonToggle.style.display = "block";
	}
	// the germany button is also used as an indicator to see if the menus are open
	// if that is the case all menus will be closed when the main layer menu button is pressed
	else {
		closeAllMenus();
	};

	// displays the requested submenus
	button = document.getElementById(menu.id);
	if (button.style.display === "none") {
		button.style.display = "block";
		boundaryButtonToggle.style.display = "block";
	} else {
		button.style.display = "none";
	};
}



/**
* @desc Closes all open submenus on click
* @author Benjamin Rieke
*/
function closeAllMenus() {
	// Hides the raster sub menu if it is still open
	var innerRasterMenuToggle = document.getElementById('rasterMenu');
	if (innerRasterMenuToggle.style.display == "block"){
		innerRasterMenuToggle.style.display = "none"
	};

	// Hides the severe weather sub menu if it is still open
	var innerUnwetterMenuToggle = document.getElementById('menu');
	if (innerUnwetterMenuToggle.style.display == "block"){
		innerUnwetterMenuToggle.style.display = "none"
	};

	// Hides germany boundary button if it is still shown
	var boundaryButtonToggle = document.getElementById('germanyButton');
	if (boundaryButtonToggle.style.display == "block"){
		boundaryButtonToggle.style.display = "none"
	};
}



/**
* @desc Removes or adds the boundary of germany on click from or to given map.
* @author Benjamin Rieke
* @param {Object} map - mapbox-map
*/
function removeAddGermany(map){

	// uses the visibility attribute of a mapbox layer
	var visibility = map.getLayoutProperty("boundaryGermany", 'visibility');

	// if the visibility is set to visible hide it
	if (visibility == "visible") {
		map.setLayoutProperty("boundaryGermany", 'visibility', 'none');
	}
	// if not display it
	else {
		map.setLayoutProperty("boundaryGermany", 'visibility', 'visible');
	}
}


// TODO: JSDoc
/**
* @desc
* @author Benjamin Rieke, Paula Scharf
* @param {Object} map mapbox-map
* @param layer - the chosen maplayer style
*/
function switchLayer(map, layer) {

	const savedLayers = [];
	const savedSources = {};

	forEachLayer(map, (layer) => {
		savedSources[layer.source] = map.getSource(layer.source).serialize();
		savedLayers.push(layer);
	});

	// takes the id from the layer and calls the showMap function
	var layerId = layer.target.id;
	map.setStyle('mapbox://styles/mapbox/' + layerId);

	if (indicator == "animation"){
		//	reloadAnimation
		reloadAnimation(wIndicator);
	}

	setTimeout(() => {
		Object.entries(savedSources).forEach(([id, source]) => {
			if (typeof map.getSource(id) === 'undefined') {
				map.addSource(id, source);
			}
		});

		savedLayers.forEach((layer) => {
			if (typeof map.getLayer(layer.id) === 'undefined') {
				map.addLayer(layer);
			}
		});
	}, 1000);
}



/**
* @desc Uses the styles that are set on the index page to switch between them on click of the switcher field
* @author Benjamin Rieke
* @param {Object} map - mapbox-map
*/
function styleSelector(map){

	// takes the map styles from the selection on the corresponding ejs-page
	let layerList = document.getElementById('styleMenu');
	let inputs = layerList.getElementsByTagName('input');

	for (var i = 0; i < inputs.length; i++) {
		// add onclick-functionality for clicking on satellite or streets button
		inputs[i].addEventListener('click', function(layer){
			switchLayer(map, layer);
		});
	}
}



/**
* @desc Loads the chosen radar product, updates the url, and hides previous selected layers
* @author Benjamin Rieke
* @param {Object} map - mapbox-map
* @param {String} product - the desired radar product (check the GitHub-Wiki for further information)
*/
function loadRaster(map, product){

	closeAllPopups();

	// set flag to radar
	wtypeFlag = "radar";

	// hide all severe weather polygons
	removeSevereWeather(map);

	console.log("Loading your requested " + product + " rain radar.");

	// update the URL
	updateURL('wtype', 'radar');
	updateURL('radProd', product);

	showLegend(map, "radar", product);

	// if no rainradar data is displayed load the requested product
	if (map.style.sourceCaches.rainradar == undefined){

		requestAndDisplayAllRainRadar(map, product);
	}
	// if a radar product is already on display remove it first
	else {
		map.removeLayer('rainradar')
		map.removeSource('rainradar')

		requestAndDisplayAllRainRadar(map, product);
	};

	// add active attribute to radar tab
	var rasterMenuToggle = document.getElementById('raster');
	rasterMenuToggle.classList.add("active");
}



/**
* @desc Hides the warning-polygons, based on the findAndRemoveOldLayerIDs function. Also changes the severeweather Tab to not active
* @author Benjamin Rieke, Katharina Poppinga
* @param {Object} map - mapbox-map
*/
function removeSevereWeather(map){

	// remove every available severe weather polygon
	for (let i = 0; i < customLayerIds.length; i++) {

		let layerID = customLayerIds[i];

		// split the String of the layerID by space for getting the type Unwetter and the dwd_ids as isolated elements
		let layerIdParts = layerID.split(/[ ]+/);

		// layerIdParts[0] contains the type of layer-element
		if (layerIdParts[0] === "unwetter" || layerIdParts[0] === "tweet") {

			// remove the corresponding layer and source from map for not displaying this warning any longer
			map.removeLayer(layerID);
			map.removeSource(layerID);

			// removes 1 element at index i from Array customLayerIds
			customLayerIds.splice(i, 1);

			// for not omitting one layerID in this for-loop after removing one
			i--;
		}
	}
	// remove the active attribute from the severe weather tab
	var menuToggle = document.getElementById('severeWeather');
	menuToggle.classList.remove("active");
	// hide the svere weather sub menu
	var selectionToggle = document.getElementById('menu');
	selectionToggle.style.display = "none";
}



/**
* @desc Loads the Unwetterpolygons, updates the url, and hides previous selected radar data
* @author Benjamin Rieke
* @param {Object} map - mapbox-map
*/
function loadSevereWeather(map){

	closeAllPopups();
	showAllExcept(map, "germany");

	// if there was the rainradar data shown before, change the legend
	if (wtypeFlag == "radar") {
		showLegend(map, "unwetter");
	}

	// set flag to severeWeather
	wtypeFlag = "severeWeather";

	// update the url
	updateURL('wtype', 'unwetter');
	deleteFromURL('radProd');

	// create checkboxes for submenus
	createWarningsCheckboxes(map);

	// if no rainradar is displayed, simply show polygons
	if (map.style.sourceCaches.rainradar == undefined){
		requestNewAndDisplayCurrentUnwetters(map);
	}
	// if rainradar-data is displayed, remove this data first
	else {

		map.removeLayer('rainradar');
		map.removeSource('rainradar');
		requestNewAndDisplayCurrentUnwetters(map);
	};

	// deactivate the raster menu
	var rasterMenuToggle = document.getElementById('raster');
	rasterMenuToggle.classList.remove("active");
	var innerRasterMenuToggle = document.getElementById('rasterMenu');
	innerRasterMenuToggle.style.display = "none";

	// uncheck all raster products
	var innerRasterCheckToggle1 = document.getElementById('radio1');
	innerRasterCheckToggle1.checked = false;
	var innerRasterCheckToggle2 = document.getElementById('radio2');
	innerRasterCheckToggle2.checked = false;
	var innerRasterCheckToggle3 = document.getElementById('radio3');
	innerRasterCheckToggle3.checked = false;

	// activate the severe weather tab
	var severeWeatherMenuToggle = document.getElementById('severeWeather');
	severeWeatherMenuToggle.classList.add("active");
}



/**
* @desc Creates checkboxes for all warnings layers (rain, snowfall, thunderstorm and black ice) in the menu of the map.
* The checkbox can be used to show and hide its corresponding layer in the map.
* @private
* @author Katharina Poppinga
* @param {Object} map - mapbox-map
*/
function createWarningsCheckboxes(map) {

	// get the HTML-div, in which the checkboxes for the warning types will be written
	let warningsMenu = document.getElementById("menu");

	warningsMenu.innerHTML = "";

	// the second strings (boolean) indicate whether this warnings-type already has a corresponding checkbox in the menu
	let warningsTypes = [
		["Rain", "false"],
		["Snowfall", "false"],
		["Thunderstorm", "false"],
		["BlackIce", "false"]
	];

	// create checkboxes
	map.style._order.forEach(function(layer) {
		for (let i = 0; i < warningsTypes.length; i++) {
		//	console.log(layer);
			if ((layer.includes(warningsTypes[i][0])) && (warningsTypes[i][1] === "false")) {
				console.log("Test");

				createWarningsCheckbox(map, warningsMenu, warningsTypes[i][0], true);
				warningsTypes[i][1] = "true";
			}
		}
	});

	if (warningsTypes[0][1] === "false" && warningsTypes[1][1] === "false" && warningsTypes[2][1] === "false" && warningsTypes[3][1] === "false") {
		warningsMenu.innerHTML = "Currently no warnings existing.";
	}
}


/**
* @desc Creates a checkbox for the given warnings-type in the given HTML-element.
* A selected/checked checkbox adds its corresponding layer to the given map.
* A deselected checkbox removes its corresponding layer from the given map.
* @private
* @author Katharina Poppinga
* @param {Object} map - mapbox-map
* @param {HTML-element-ID} warningsMenu - ID of HTML element into which the checkboxes will be written
* @param {String} type - type of warnings (equals content of layerGroup), one of the following: ("Rain", "Snowfall", "Thunderstorm", "BlackIce")
* @param {boolean} checked - true if a route is selected, false if not
*/
function createWarningsCheckbox(map, warningsMenu, type, checked) {

	// the type BlackIce needs a separate call because in the menu its type has to be changed to "Black ice" (with a space)
	if (type === "BlackIce") {
		// add the checkbox for the warnings-type (which calls the function showWarningsType(i) if clicked) to the content of the "warningsMenuDiv"
		warningsMenu.innerHTML = warningsMenu.innerHTML + "  <input type='checkbox' id='warningsCheckbox_" + type + "' onclick='showHideWarningsType(map, \"" + type + "\")'" + ((checked) ? "checked" : "") + "> Black ice<br>";
	}
	else {
		// add the checkbox for the warnings-type (which calls the function showWarningsType(i) if clicked) to the content of the "warningsMenuDiv"
		warningsMenu.innerHTML = warningsMenu.innerHTML + "  <input type='checkbox' id='warningsCheckbox_" + type + "' onclick='showHideWarningsType(map, \"" + type + "\")'" + ((checked) ? "checked" : "") + "> " + type + "<br>";
	}
}



/**
* @desc This function is called when clicking the checkbox.
* If checkbox is selected, the corresponding layer (the given type) is shown in the given map.
* If checkbox is deselected, the corresponding layer (the given type) is set to invisible for the given map.
* @private
* @author Katharina Poppinga
* @param {Object} map - mapbox-map
* @param {String} type - type of warnings (equals content of layerGroup), one of the following: ("Rain", "Snowfall", "Thunderstorm", "BlackIce")
*/
function showHideWarningsType(map, type){

	// label the warnings-type-checkbox
	let checkBox = document.getElementById("warningsCheckbox_" + type);

	// if the checkbox is checked, show the corresponding warnings in the map
	if (checkBox.checked) {
		map.style._order.forEach(function(layer) {
			if (layer.includes("unwetter " + type)) {
				map.setLayoutProperty(layer, 'visibility', 'visible');
			}
		});
	}

	// if the checkbox is deselected, hide the corresponding warnings
	else {
		closeAllPopups();
		map.style._order.forEach(function(layer) {
			if (layer.includes("unwetter " + type)) {
				map.setLayoutProperty(layer, 'visibility', 'none');
			}
		});
	}
}



// ********************************** POP-UPS **********************************

/**
* @desc This method makes elements of a specific layer (identified by layerID) clickable and gives them Popups.
* @author Katharina Poppinga
* @param {Object} map - mapbox-map
* @param {String} layerID - ID of a layer
*/
function makeLayerInteractive(map, layerID) {

	// ************************ changing of curser style ***********************
	// https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/
	// if hovering the layer, change the cursor to a pointer
	map.on('mouseenter', layerID, function () {
		map.getCanvas().style.cursor = 'pointer';
	});
	// if leaving the layer, change the cursor back to a hand
	map.on('mouseleave', layerID, function () {
		map.getCanvas().style.cursor = '';
	});

	// ************************ showing popups on click ************************
	// TODO: Problem: wenn AOI drüber liegt, können keine Popups ausgewählt werden
	// TODO: Problem: Wenn mehrere Layer übereinander liegen, wird beim Klick nur eine Info angezeigt
	map.on('click', layerID, function (e) {
		if (document.getElementsByClassName("mapboxgl-popup").length < 1) {
			if (layerID.includes("tweet")) {
				showTweetPopup(map, e);
			} else {
				showUnwetterPopup(map, e);
			}
		}
	});
}



/**
* @desc Provides a popup that will be shown onclick for each warning displayed in the map.
* The popup gives information about the period of validity and a description of the warning.
* @author Katharina Poppinga
* @param {Object} map mapbox-map in which the warnings are in
* @param {Object} e - listener-event
*/
function showUnwetterPopup(map, e) {

	if (popupsEnabled) {
		if (e) {
			// get information about the feature on which it was clicked
			var picked = map.queryRenderedFeatures(e.point);

			if (picked[0].source.includes("unwetter")) {

				// formatting timestamp for cutting the textual description of timestamp
				let formattedOnsetTimestamp = timestampFormatting(picked[0].properties.onset);
				let formattedExpiresTimestamp = timestampFormatting(picked[0].properties.expires);

				// if an instruction (to the citizen, for acting/behaving) is given by the DWD ...
				if (picked[0].properties.instruction !== "null") {
					// ... create a popup with the following information: event-type, description, onset and expires timestamp (as MEZ) and an instruction
					new mapboxgl.Popup()
					.setLngLat(e.lngLat)
					.setHTML("<b>" + picked[0].properties.event + "</b>" + "<br>" + picked[0].properties.description + "<br><b>onset: </b>" + formattedOnsetTimestamp + "<br><b>expires: </b>" + formattedExpiresTimestamp + "<br>" + picked[0].properties.instruction)
					.addTo(map);
				}
				// if a instruction is not given by the DWD ...
				else {
					// ... create a popup with above information without an instruction
					new mapboxgl.Popup()
					.setLngLat(e.lngLat)
					.setHTML("<b>" + picked[0].properties.event + "</b>" + "<br>" + picked[0].properties.description + "<br><b>onset: </b>" + formattedOnsetTimestamp + "<br><b>expires: </b>" + formattedExpiresTimestamp)
					.addTo(map);
				}
			}
		}
	}
}


/**
* @desc Provides a popup that will be shown onclick for each Tweet displayed in the map.
* The popup gives information about the author, the message content and time of creation
* @author Paula Scharf
* @param {Object} map - mapbox-map in which the warnings are in
* @param {Object} e listener-event
*/
function showTweetPopup(map, e) {
	if (popupsEnabled) {
		// get information about the feature on which it was clicked
		var pickedTweet = map.queryRenderedFeatures(e.point);

		if (pickedTweet[0].source.includes("tweet")) {
			if(!document.getElementById("deleteBtn")) {
				let idAsString = pickedTweet[0].properties.idstr;
				// create a popup with the following information:
				let popup = new mapboxgl.Popup()
				.setLngLat(e.lngLat)
				.setHTML("<div id='" + idAsString + "'><div id='" + idAsString + "twttr'></div><div id='" + idAsString + "btn'></div></div>")
				.addTo(map);
				twttr.widgets.createTweet(
					idAsString,
					document.getElementById(idAsString + "twttr"),
					{
						width: 1000,
						dnt: true
					}
				);
				let popupDiv = document.getElementById(idAsString + "btn");
				let deleteBtn = document.createElement("button");
				deleteBtn.setAttribute("id", "deleteBtn");
				deleteBtn.setAttribute("class", "btn btn-danger");
				deleteBtn.addEventListener('click', function(){
					deleteTweet(map, idAsString, popup);
				});
				deleteBtn.innerText = "delete tweet";
				popupDiv.appendChild(deleteBtn);
			}
		}
	}
}
