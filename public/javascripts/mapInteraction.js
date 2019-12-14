// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/



// ****************************** global variables *****************************

// TODO: JSDoc für globale Variablen




// ******************************** functions **********************************

// TODO: classes übergeben und verwenden bei radar!!
/**
* @desc
*
*
* @author Katharina Poppinga
* @private
* @param {mapbox-map} map - mapbox-map for and in which to display the legend
* @param {String} typeOfLegend - unwetter or radar
* @param {Array} classes - just needed for radar, not used for unwetter
*/
function showLegend(map, typeOfLegend, classes) {

	let values = [];
	let colors = [];
	let paraTypeOfLegend = document.getElementById("typeOfLegend");
	let dataSource = document.getElementById("dataSource");
	let timestampLastRequest = document.getElementById("timestampLastRequest");
	let refreshRate = document.getElementById("refreshRate");
	let posAccuracy = document.getElementById("posAccuracy");


	// legend for Unwetter
	if (typeOfLegend === "unwetter") {

		// set titel of legend
		paraTypeOfLegend.innerHTML = "<b>Severe weather</b>";

		// TODO: BESSER MACHEN, INFOS DIREKT AUS LAYERN NEHMEN?? NICHT DIREKT MÖGLICH, DA JEDER TYPE VIELE LAYER HAT
		//let allCurrentLayers = map.getStyle().layers;
		// TODO: ABSTIMMEN MIT DISPLAY VON EINZELNEN TYPES ÜBER BUTTON
		// TODO: an endgültige Farben und feinere Farbabstufungen anpassen
		values = ["Rain", "Snowfall", "Thunderstorm", "Black ice", "Other"]
		colors = ["blue", "yellow", "red", "white", "grey"];
	}

	// legend for rain radar
	if (typeOfLegend === "radar") {

		// set titel of legend
		paraTypeOfLegend.innerHTML = "<b>Depth of precipitation</b>";

		let productType = document.createElement("p"); // create a html-paragraph
		productType.id = "productType"; // set ID of the html-paragraph
		productType.innerHTML = "TODO: Rain radar product type: " + paramArray.radProd;
		paraTypeOfLegend.appendChild(productType);


		// TODO: ABSTIMMEN MIT DISPLAY VON EINZELNEN TYPES ÜBER BUTTON


		// TODO: KLASSEN DIREKT AUS JSON AUS DB NEHMEN
		// Beispiel für SF
		let classes = [[0,0.01,1],[0.01,0.034,2],[0.034,0.166,3],[0.166,10000,4]];

		//values = ["0 to 0.01", "0.01 to 0.034", "0.034 to 0.166", "0.166 to 10000"];

		// TODO: letzte werte zu kleinerer oder größerer klasse gehörig?
		values = [(classes[0][0] + " mm to " + classes[0][1] + " mm"), (classes[1][0] + " mm to " + classes[1][1] + " mm"), (classes[2][0] + " mm to " + classes[2][1] + " mm"), (classes[3][0] + " mm to " + classes[3][1] + " mm")];
		colors = ["#b3cde0", "#6497b1", "#03396c", "#011f4b"];
	}


	let l;
	// for-loop over every element-pair (value and color) for the legend
	for (l = 0; l < values.length; l++) {
		let item = document.createElement('div');

		let colorKey = document.createElement('span');
		colorKey.className = 'colorKey';
		colorKey.style.backgroundColor = colors[l];

		let value = document.createElement('span');
		value.innerHTML = values[l];

		item.appendChild(colorKey);
		item.appendChild(value);
		legend.appendChild(item);
	}

	//
	dataSource.innerHTML = "<b>data source:</b><br>Deutscher Wetterdienst<br>(evtl. Logo einfügen)";
	timestampLastRequest.innerHTML = "<b>timestamp of last request:</b><br>";
	let refreshRateValue = paramArray.config.refresh_rate;
	refreshRate.innerHTML = "<b>refresh rate:</b><br>" + refreshRateValue + " ms  (&#8773 " + msToMin(refreshRateValue) + " min)";
	posAccuracy.innerHTML = "<b>positional accuracy of data:</b><br>TODO!";
}



/**
* https://stackoverflow.com/questions/21294302/converting-milliseconds-to-minutes-and-seconds-with-javascript
*/
function msToMin(ms) {
	var min = Math.floor(ms / 60000);
	var sec = ((ms % 60000) / 1000).toFixed(0);
	return min + ":" + (sec < 10 ? '0' : '') + sec;
}



/**
* @desc
*
* @author Katharina Poppinga
* @param {} directionToPan - the direction in which the map to pan: left, right, up or down
*/
function panMapWithButton(directionToPan) {

	// TODO: 4 pan-Buttons fehlen noch

	// TODO: so noch unsinnig, da Verschiebung um x Grad nicht abhängig von Zoomlevel ist

	let center = map.getCenter();
	let newCenter;

	switch (directionToPan) {
		case (directionToPan = "left"):
		newCenter = [center.lng - 10, center.lat];
		break;
		case (directionToPan = "right"):
		newCenter = [center.lng + 10, center.lat];
		break;
		case (directionToPan = "up"):
		newCenter = [center.lng, center.lat + 10];
		break;
		case (directionToPan = "down"):
		newCenter = [center.lng, center.lat - 10];
		break;
	}

	map.panTo(newCenter);

	// map.panBy();
}



/**
* Zoom to the given Coordinates.
* @author https://gist.github.com/aerispaha/826a9f2fbbdf37983dc01e6074ce7cd7
* @param coordinates
*/
function zoomToCoordinates(coordinates) {
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
}



/**
* This function adds a layer (identified by the given layerID) to the layer-menu.
* The layer-menu makes it possible to toggle layers on and off.
* @author Benjamin Rieke
* @param {String} layerID - ID of a layer
*/
function addLayerToMenu(layerID) {
	// split layerID on whitspace
	let layerParts = layerID.split(/[ ]+/);
	let groupName = layerParts[1];
	// if the groupName is not 'undefined' do the following...
	if (groupName) {
		// check if there is already a menu element for the group
		let layerGroupAlreadyIncluded = false;
		layers.childNodes.forEach(function (item) {
			if (item.innerText === groupName) {
				layerGroupAlreadyIncluded = true;
			}
		});
		// if the manu does not contain an element for the group do the following...
		if (!layerGroupAlreadyIncluded) {
			// create an element for the menu
			var link = document.createElement('a');
			link.href = '#';
			link.className = 'active';
			link.textContent = groupName;

			// on click show the menu if it is not visible and hide it if it is visible
			link.onclick = function (e) {
				if (this.className) {
					this.className = '';
				} else {
					this.className = 'active';
				}
				// 'this' changes scoop in the loop, so the contents of the link have to be outsourced
				let content = this.textContent;
				let classname = this.className;
				customLayerIds.forEach(function (item) {
					// if the current Id ('item') contains the name of the group do the following
					if (item.includes(content)) {
						e.preventDefault();
						e.stopPropagation();

						// if the menuitem is activated show the layer
						if (classname) {
							map.setLayoutProperty(item, 'visibility', 'visible');
						}
						// if not hide the layer
						else {
							map.setLayoutProperty(item, 'visibility', 'none');
						}
					}
				});
			};

			// add the layers to the menu
			layers.appendChild(link);
		}
	}
}



/**
* @desc Opens and closes the menu for the selection of the routes and changes the button to an X
* @param button Links the button to the function for the animation
* @param menu Id of the menu that is supposed to open/close
* @author Benjamin Rieke
*/
function openMenu(button, menu) {

	button = document.getElementById(menu.id);
	if (button.style.display === "none") {
		button.style.display = "block";
	} else {
		button.style.display = "none";
	}
}


/**
* @desc Closes all open submenus on click
* @author Benjamin Rieke
*/
function closeAllMenus() {
	var innerRasterMenuToggle = document.getElementById('rasterMenu');
	if (innerRasterMenuToggle.style.display == "block"){
		innerRasterMenuToggle.style.display = "none"
	};
	var innerUnwetterMenuToggle = document.getElementById('menu');
	if (innerUnwetterMenuToggle.style.display == "block"){
		innerUnwetterMenuToggle.style.display = "none"
	};
}



/**
* @desc Calls the showMap function with the desired mapstyle that is chosen from the selection on the indexpage
* @param layer - The chosen maplayer style
* @author Benjamin Rieke, Paula Scharf
*/
function switchLayer(layer) {
	const savedLayers = [];
	const savedSources = {};
	forEachLayer((layer) => {
		savedSources[layer.source] = map.getSource(layer.source).serialize();
		savedLayers.push(layer);
	});

	//Takes the id from the layer and calls the showMap function
	var layerId = layer.target.id;
	map.setStyle('mapbox://styles/mapbox/' + layerId);

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



// TODO: folgende Funktion sinnvoll benennen
/**
*
*
* @author Benjamin Rieke
*/
function nameFinden(){

	// Takes the map styles from the selection on the index page
	let layerList = document.getElementById('styleMenu');
	let inputs = layerList.getElementsByTagName('input');


	for (var i = 0; i < inputs.length; i++) {
		inputs[i].onclick = switchLayer;
	}
}



// TODO: Deactivating the field after window is closed
/*
* Changes the style of a menu selector to active on click
* @author Benjamon Rieke
*/
$(function () {
	//var $lists = $('.list-group li').click(function(e) {

	$(".selector").click(function () {
		$(this).toggleClass("active");
	});
});


/**
* Loads the chosen radar product, updates the url, and hides previous selected layers
* @author Benjamin Rieke
* @param product -The desired radar product. CHeck the github wiki for further informations
*/
function loadRaster(product){

	console.log("Loading your requested radar product");
	updateURL('wtype', 'radar');
	updateURL('radProd', product);

	if (map.style.sourceCaches.rainRadar == undefined){

		requestAndDisplayAllRainRadar(map, product, "dwd");
	}
	else {
		map.removeLayer('rainRadar')
		map.removeSource('rainRadar')

		requestAndDisplayAllRainRadar(map, product, "dwd");
	};
}


/**
* Hides the Unwetter polygons
* @author Benjamin Rieke
*/
function hideUnwetter(){

	map.style._order.forEach(function(layer) {
		let mapLayer = layer;

		if (mapLayer.includes("Unwetter other") ) {
			map.setLayoutProperty(layer, 'visibility', 'none');
			console.log("hid one unwetter polygon");
		}
	});

	var menuToggle = document.getElementById('severeWeather');
	menuToggle.classList.remove("active");
	var selectionToggle = document.getElementById('menu');
	selectionToggle.style.display ="none";
}


/**
* Loads the Unwetterpolygons, updates the url, and hides previous selected radar data
* @author Benjamin Rieke
*/
function loadSevereWeather(){
	// update the url
	updateURL('wtype', 'unwetter');
	updateURL('radProd', '');
	// if no rainradar is displayed simply show polygons
	if (map.style.sourceCaches.rainRadar == undefined){
		requestNewAndDisplayCurrentUnwetters(map);
	}
	// if not remove them first
	else {
		map.removeLayer('rainRadar')
		map.removeSource('rainRadar')
		requestNewAndDisplayCurrentUnwetters(map);
	};

	map.style._order.forEach(function(layer) {
		let mapLayer = layer;

		if (mapLayer.includes("Unwetter other") ) {
			map.setLayoutProperty(layer, 'visibility', 'visible');
			console.log("hid one unwetter polygon");
		}
	});

	var rasterMenuToggle = document.getElementById('raster');
	rasterMenuToggle.classList.remove("active");
	var innerRasterMenuToggle = document.getElementById('rasterMenu');
	innerRasterMenuToggle.style.display = "none";

}



// ********************************** POP-UPS **********************************

/**
* This method makes elements of a specific layer (identified by layerID) clickable and gives them Popups.
* @author Katharina Poppinga
* @param {String} layerID - ID of a layer
*/
function makeLayerInteractive(layerID) {

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
	// TODO: Problem: Popups poppen auch auf, wenn Nutzer-Polygon (Area of Interest) eingezeichnet wird. Das sollte besser nicht so sein?
	// TODO: Problem: Wenn mehrere Layer übereinander liegen, wird beim Klick nur eine Info angezeigt
	map.on('click', layerID, function (e) {
		if (layerID.includes("Tweet")) {
			showTweetPopup(map,e);
		} else {
			showUnwetterPopup(map,e);
		}
	});
}


// TODO: Popups scrollbar machen oder enthaltenen Text kürzen??

/**
* @desc Provides a popup that will be shown onclick for each Unwetter displayed in the map.
* The popup gives information about the period of validity and a description of the warning.
* @author Katharina Poppinga
* @private
* @param {mapbox-map} map map in which the Unwetter-features are in
* @param {Object} e ...
*/
function showUnwetterPopup(map, e) {

	if (e) {
		// get information about the feature on which it was clicked
		var picked = map.queryRenderedFeatures(e.point);

		// TODO: Sommerzeit im Sommer??

		// TODO: später source im Popup herauslöschen, momentan nur nötig für entwicklung

		if (picked[0].source.includes("Unwetter")) {
			// if an instruction (to the citizen, for acting/behaving) is given by the DWD ...
			if (picked[0].properties.instruction !== "null") {
				// ... create a popup with the following information: event-type, description, onset and expires timestamp (as MEZ) and an instruction
				new mapboxgl.Popup()
				.setLngLat(e.lngLat)
				.setHTML("<b>" + picked[0].properties.event + "</b>" + "<br>" + picked[0].properties.description + "<br><b>onset: </b>" + new Date(picked[0].properties.onset) + "<br><b>expires: </b>" + new Date(picked[0].properties.expires) + "<br>" + picked[0].properties.instruction + "<br><b>mapSource: </b>" + picked[0].source)
				.addTo(map);
			}
			// if a instruction is not given by the DWD ...
			else {
				// ... create a popup with above information without an instruction
				new mapboxgl.Popup()
				.setLngLat(e.lngLat)
				.setHTML("<b>" + picked[0].properties.event + "</b>" + "<br>" + picked[0].properties.description + "<br><b>onset: </b>" + new Date(picked[0].properties.onset) + "<br><b>expires: </b>" + new Date(picked[0].properties.expires) + "<br><b>mapSource: </b>" + picked[0].source)
				.addTo(map);
			}
		}
	}
}


/**
* @desc Provides a popup that will be shown onclick for each Tweet displayed in the map.
* The popup gives information about the author, the message content and time of creation
* @author Paula Scharf
* @private
* @param {mapbox-map} map map in which the Unwetter-features are in
* @param {Object} e ...
*/
function showTweetPopup(map, e) {
	// get information about the feature on which it was clicked
	var pickedTweet = map.queryRenderedFeatures(e.point);

	if (pickedTweet[0].source.includes("Tweet")) {
		let idAsString = JSON.stringify(pickedTweet[0].properties.id);
		// ... create a popup with the following information: event-type, description, onset and expires timestamp and a instruction
		new mapboxgl.Popup()
		.setLngLat(e.lngLat)
		.setHTML("<div id='" + idAsString + "'></div>")
		.addTo(map);
		twttr.widgets.createTweet(
			idAsString,
			document.getElementById(idAsString),
			{
				width: 1000,
				dnt: true
			}
		);
	}
}

// *****************************************************************************
