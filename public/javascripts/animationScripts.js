// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/



// ****************************** global variables *****************************

// TODO: dies in Funktion schreiben??
// paula fragen
// is there a timestamp?
let currentTimestamp = Date.now();
if (typeof paramArray.timestamp !== "undefined") {
  // none found, create "now"
  currentTimestamp = paramArray.timestamp;
  try {
    Date.parse(currentTimestamp);
  } catch {
    console.log("The URL is erroneous. Please try a different value for 'timestamp'.");
    currentTimestamp = Date.now();
  }
}


/**
* refers to the layer menu
* @type {mapbox_map}
*/
let animationMap;


// TODO: JSDoc für globale Variablen

let resultOutput = [];

let usedTimestamps = [];
// all individual events from a timestamp get temporally stored in here
let outputArray = [];
// contains the sources in geojson format
let final = [];
// a geojson mask
let mask = [];
// an array where all active layers are stored
let allLayers = [];
// stores all geojsons with their timestamps
let timestampStorage = [];
// indicates which weathertype is requested
wtypeFlag = [];
// adds up canvasshots from the map in base64 format
var imageArray = [];
// the final output to create a gif from
var gifArray = [];
// the intervall that is started with the animation and used to stop it
var automationIntervall;
// gives the information that the styleswitcher is on the animation page
var indicator = "";
// // gives the wtype information to the style since the paramarray wont change
var wIndicator = "";



/**
* @desc Based on the showMap function in the mapbox.js file.
* minimized to fulfill the animationsmap purpose
* This function is called, when "animation.ejs" is loaded.
* @author Katharina Poppinga, Jonathan Bahlmann, Benjamin Rieke
*/
function showAnimationMap() {

  indicator = "animation";

  // Checks whether the layer menu DOM is empty and if not flushes the dom
  while (layers.firstChild) {
    layers.removeChild(layers.firstChild);
  }

  // declare var
  let baseURL;
  let zoomURL;
  let centerURL;
  let style;

  var checkedStreets = document.getElementById('navigation-guidance-day-v4');
  var checkedSat = document.getElementById('satellite-v9');

  // if not yet in URL, take and update to default streets
  if (paramArray.base == undefined) {
    style = "mapbox://styles/mapbox/navigation-guidance-day-v4";
    updateURL("base", "streets");
    // otherwise use value from URL
  } else {
    baseURL = paramArray.base;
    if (baseURL === "streets") {
      style = "mapbox://styles/mapbox/navigation-guidance-day-v4";
      checkedStreets.checked ='checked';
    }
    if (baseURL === "satellite") {
      style = "mapbox://styles/mapbox/satellite-v9";
      checkedSat.checked ='checked';
    }
  }

  // if not yet in URL, use default warnings
  if (paramArray.wtype == undefined) {
    updateURL("wtype", "unwetter");
  }

  // if not yet in URL, get value from config.yaml
  if (paramArray.mapZoom == undefined) {
    zoomURL = paramArray.config.map.zoom;
    updateURL("mapZoom", zoomURL);
    // otherwise use value from URL
  } else {
    zoomURL = paramArray.mapZoom;
  }

  // if not yet in URL, get value from config.yaml
  if (paramArray.mapCenter == undefined) {
    centerURL = paramArray.config.map.center;
    updateURL("mapCenter", centerURL);
    // otherwise use value from URL
  } else {
    centerURL = JSON.parse(paramArray.mapCenter);
  }

  // create new map with variable zoom and center
  animationMap = new mapboxgl.Map({
    container: 'animationMap',
    style: style,
    zoom: zoomURL,
    center: centerURL,
    preserveDrawingBuffer: true
  });

  // update URL when moving the map
  animationMap.on('moveend', function() {
    updateURL('mapZoom', animationMap.getZoom());
    let center = animationMap.getCenter();
    let centerString = "[" + center.lng + "," + center.lat + "]";
    updateURL('mapCenter', centerString);
  });

  // add zoom and rotation controls to the map
  animationMap.addControl(new mapboxgl.NavigationControl());

  // enables the ability to choose between different mapstyles
  styleSelector(animationMap);

  // ************************ adding boundary of Germany *************************
  // this event is fired immediately after all necessary resources have been downloaded and the first visually complete rendering of the map has occurred
  animationMap.on('load', function() {
    // resize map to full screen
    animationMap.resize();
    // for a better orientation, add the boundary of germany to the map
    animationMap.addLayer({
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

    var innerUnwetterMenuToggle = document.getElementById('menu');

    // add functionality for menu selection on radar product call
    $("#raster").click(function() {
      innerUnwetterMenuToggle.style.display = "none";
      reloadAnimation('radar');
    });

    // add functionality for menu selection on severeweather call
    $("#severeWeatherAnimation").click(function() {
      innerUnwetterMenuToggle.style.display = "block";
      reloadAnimation('unwetter');
    });

    let rasterMenuToggle = document.getElementById('raster');
    let severeWeatherMenuToggle = document.getElementById('severeWeatherAnimation');

    if (readURL("wtype") == "radar") {
      // set the flag to radar
      wtypeFlag = "radar";

      // toggle the menu tabs for radar and severe weather to active or not active
      rasterMenuToggle.classList.toggle("active");
      severeWeatherMenuToggle.classList.remove("active");

      showLegend(animationMap, "radar", "ry");
      let dataTimestamp = document.getElementById("dataTimestamp");
      dataTimestamp.innerHTML = "<b>Timestamp of current timestep:</b><br>";

      loadPreviousWeather(animationMap, wtypeFlag);
    }

    if ((paramArray.wtype === "unwetter") || (paramArray.wtype === undefined)) {

      //set URL to requested wtype
      updateURL("wtype", "unwetter");
      // set the flag to severe weather
      wtypeFlag = "severeWeather";

      // toggle the menu tabs for radar and severe weather to active or not active
      rasterMenuToggle.classList.remove("active");
      severeWeatherMenuToggle.classList.add("active");
      //display the legend according to the weathertype
      showLegend(animationMap, "unwetter");

      // the last warnings request was ...-milliseconds ago
      let msecsToLastUnwetterRequest = Date.now() - paramArray.config.timestamp_last_warnings_request;
      loadPreviousWeather(animationMap, wtypeFlag);
    }

    // add manual functionality for the slider
    document
    .getElementById('slider')
    .addEventListener('input', function(e) {
      let val = document.getElementById('slider').value;
      // maximum of the slider
      document.getElementById('slider').max = usedTimestamps.length-1;
      //the number of the timestamp
      var timestampNum = parseInt(e.target.value, 10);
      loadAnimation(timestampNum, animationMap);
      //reset the imageArray
      imageArray = [];
    });

    //enable the animation functionality
    automate(animationMap);
  });

}


/**
* @desc Combines several functions to reload the animation for the chosen weather type.
* @param {String} wType - the desired type of weather
* @author Benjamin Rieke
*/
function reloadAnimation(wType){

  var rasterMenuToggle = document.getElementById('raster');
  var severeWeatherMenuToggle = document.getElementById('severeWeatherAnimation');
  var innerRasterMenuToggle = document.getElementById('rasterMenu');
  var menuToggle = document.getElementById('severeWeatherAnimation');

  // when another animation is running stop it first
  clearInterval(automationIntervall);
  // remove all old sources
  removeAllSource(animationMap);
  closeAllPopups();
  //if the weathertype is severeweather
  if (wType == 'unwetter'){
    // weathertype indicator for style switcher
    wIndicator = wType;
    //update the URL
    updateURL("wtype", "unwetter");
    // set the weathertype
    wtypeFlag = "severeWeather";
    //display the legend
    showLegend(animationMap, "unwetter");
    //request the previous weather
    loadPreviousWeather(animationMap, wtypeFlag);

    // update the menu
    rasterMenuToggle.classList.remove("active");
    innerRasterMenuToggle.style.display = "none";

    // activate the severe weather tab
    severeWeatherMenuToggle.classList.add("active");
  }
  //if the weathertype is radar
  else {
    // weathertype indicator for style switcher
    wIndicator = wType;
    //update the URL
    updateURL("wtype", "radar");
    updateURL("radProd", "ry");
    // set the weathertype
    wtypeFlag = "radar";
    //display the legend
    showLegend(animationMap, "radar", "ry");
    let dataTimestamp = document.getElementById("dataTimestamp");
    dataTimestamp.innerHTML = "<b>Timestamp of current timestep:</b><br>";

    //request the previous weather
    loadPreviousWeather(animationMap, wtypeFlag);
    // update the menu
    rasterMenuToggle.classList.add("active");
    menuToggle.classList.remove("active");
  }

  // set the animation slider to the first position
  $("#slider").prop("value", 0);
  // in case the weathertype is changed during the animation unbind the button
  $("#playButton").unbind();
  // change image to play icon
  $("#pauseplay").attr("src", "/css/iconfinder_icon-play.svg");
  //and reset everything
  automate(animationMap);
  //flush the image array
  imageArray = [];
  //flush the layer array
  allLayers = [];
  //flush the gif array
  gifArray = [];
  // reset the downloadbutton and its popups
  $("#downloadButton").css({'background-color': 'darkgrey'});
  $('#downloadButton').prop('title', 'Please wait for one animation cycle!');
  $('#downloadPopup').html('You have to wait for one animation cycle!');
  $("#downloadPopup").css({'background-color': 'DimGray'});
}


/**
* @desc Adds functionality to the slider and to the pause, play and download buttons.
* @param {Object} map - links to the mapbox-map
* @author Benjamin Rieke
*/
function automate(map){
  var popup = document.getElementById("playPopup");

  // on playbutton click
  $("#playButton").click(function play() {

    // if there is no data for the requested wtype show a popup to inform the user to do so beforehand
    if (resultOutput.length){
      if (Object.keys(resultOutput[0]).length == 1) {
        $("#playPopup").css({'background-color': 'darkgrey'});
        $('#playPopup').html('There is nothing worthy to show right now. Try out the demo data.');

        //avoid multiple click events
        if (popup.classList[1] != "show"){
          // show the popup
          popup.classList.toggle("show");
          // hide the popup after some time
          setTimeout(function(){
            popup.classList.toggle("show");
          }, 4000);
        }
        return;
      }
    }

    if (usedTimestamps.length == 0) {
      $("#playPopup").css({'background-color': 'red'});
      //avoid multiple click events
      if (popup.classList[1] != "show"){
        // show the popup
        popup.classList.toggle("show");
        // hide the popup after some time
        setTimeout(function(){
          popup.classList.toggle("show");
        }, 4000);
      }
      return;
    }
    // flush the intervall
    automationIntervall = undefined;
    // value of the slider (the position)
    let val = document.getElementById('slider').value;
    // maximum of the slider
    document.getElementById('slider').max = usedTimestamps.length-1;

    var max = document.getElementById('slider').max;
    // first value of the slider
    var min = document.getElementById('slider').min;

    // initialize the animation
    loadAnimation(val, map);

    // name the intervall to have access to it for stopping
    automationIntervall = setInterval(function(){
      // if the maximum value is not reached increase value to the next int
      if (val < max) {
        val ++;
        // set the sliders value according to the current one
        $("#slider").prop("value", val);
        // load the layers for the timestamp on the val position
        loadAnimation(val, map);
        //save the current map canvas as a base64 formatted array entry
        takeScreenshot();
      }
      // if the maximum is reached set the value to the minimum
      else {
        val = min;
        $("#slider").prop("value", val);
        // load the layers for the timestamp on the val position
        loadAnimation(val, map);
        //save the current map canvas as a base64 formatted array entry
        takeScreenshot();
      }
    }, 2000);

    // after using the playpausebutton once unbind its function
    $("#playButton").unbind();
    // change image to pause icon
    $("#pauseplay").attr("src", "/css/iconfinder_icon-pause.svg");

    // add new functionality to it so it stops the animation
    $("#playButton").click(function() {
      clearInterval(automationIntervall);
      // unbind its function again
      $("#playButton").unbind();
      // change image to play icon
      $("#pauseplay").attr("src", "/css/iconfinder_icon-play.svg");
      // and afterwards set it back to its original functionality
      $("#playButton").click(function() {
        play();
      });
    });
  });
}


// TODO: in onload-Funktion?
// functionality for the download button
$("#downloadButton").click(function() {
  // set reference for the popup
  var popup = document.getElementById("downloadPopup");
  // if the gifarray is not empty
  if(gifArray.length){
    // create a gif with the images from the last displayed animation cycle
    createGif(gifArray);
    $('#downloadPopup').html('Your animation download will start in a few seconds');
  }

  //avoid multiple click events
  if (popup.classList[1] != "show"){
    // show the popup
    popup.classList.toggle("show");
    // hide the popup after some time
    setTimeout(function(){
      popup.classList.toggle("show");
    }, 4000);
  }
});


/**
* @desc Uses the html2canvas libary to take a screenshot of the map div
* and then saves that base64 encoded screenshot in the image array.
* @author Benjamin Rieke
*/
function takeScreenshot(){
  //save the current map canvas as a base64 formatted array entry
  html2canvas(document.querySelector("#animationMap")).then(function(canvas){
    var gifImage = canvas.toDataURL('image/jpeg');
    imageArray.push(gifImage);
    // activate the downloadbutton if ready
    setToReady();
  });
}


/**
* @desc Checks if the imageArray is uptodate with the amount of used
* timestamps and if so, set the download in a ready state.
* @author Benjamin Rieke
*/
function setToReady(){
  // when the imageArray has as many entries as the animation does
  if (imageArray.length == usedTimestamps.length){
    // adjust the button and the popup
    $("#downloadButton").css({'background-color': 'white'});
    $('#downloadButton').prop('title', 'Download the current animation');
    $('#downloadPopup').html('Now you can click to download');
    $("#downloadPopup").css({'background-color': 'green'});

    // pass the results to a new array for the conversion to a gif file
    gifArray = imageArray;
    // flush the array so there are never more images than timestempsa
    imageArray = [];
  }
}



/**
* @desc Adds the desired layer, removes the others and displays the date according to the timestamp
* @param position checks at which position each timestamp is supposed to be displayed
* @param {Object} map - mapbox-map
* @author Benjamin Rieke
*/
function loadAnimation(position, map){
  // set a "marker" for the wanted position based on the available timestamps
  let posMarker = usedTimestamps[position];

  // transform the time from milliseconds to date
  let formattedTimestamp = timestampFormatting(+usedTimestamps[position]);
  // add to UI
  document.getElementById('timestamp').innerHTML = formattedTimestamp;

  //check if a layer is shown
  for (let i = 0; i < allLayers.length; i++) {
    // if yes remove them
    map.removeLayer(allLayers[i]);
  }
  closeAllPopups();

  //flus array in case
  allLayers = [];
  customLayerIds.forEach(function (layerID) {
    let layerIdParts = layerID.split(/[ ]+/);
    if (layerIdParts[1] == posMarker) {

      let dataTimestamp = document.getElementById("dataTimestamp");
      dataTimestamp.innerHTML = "<b>Timestamp of current timestep:</b><br>" + formattedTimestamp;

      // add the correct layer
      if (layerID.includes("radar")) {
        map.addLayer({
          "id": layerID,
          "type": "fill",
          "source": layerID,
          "layout": {"visibility": "visible"},
          "paint": {
            "fill-color": {
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
      } else if (layerID.includes("unwetter")) {
        map.addLayer({
          'id': layerID,
          'type': 'fill',
          'source': layerID,
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
      } else if (layerID.includes("tweet")) {
        map.addLayer({
          "id": layerID,
          "type": "symbol",
          "source": layerID,
          "layout": {
            "icon-image": ["concat", "circle", "-15"],
            "visibility": "visible"
          }
        });
      }

      makeLayerInteractive(map, layerID);
      createWarningsCheckboxes(animationMap);
      allLayers.push(layerID);
    }
  });
}


/**
* @desc Function provided from gif libary Gifshot
* @param array image containing array
* @author Benjamin Rieke
*/
function createGif(array) {
  var date = new Date();
  var utc = date.toJSON().slice(0,10).replace(/-/g,'/');
  var time = date.toLocaleTimeString();
  var filename = utc + '/'+time;

  gifshot.createGIF({
    images: array,
    interval: 0.8,
    sampleInterval: 0.5,
    numWorkers: 5,
    'gifWidth': 800,
    'gifHeight': 400,
  }, function (obj) {
    if (!obj.error) {
      var image = obj.image;
      download(image, filename, 'image/gif');
    }
  });
}


/**
* @desc Performs the actual db call to retrieve the previousWeather data
* and fits every event according to its timestamp into an array.
* @param {Object} map - Links to the mapbox-map
* @param {String} weatherEv -
* @author Benjamin Rieke
*/
function loadPreviousWeather(map, weatherEv){
  // flush the storage arrays
  usedTimestamps = [];
  timestampStorage = [];
  resultOutput = [];

  var weatherEvent;
  if (weatherEv === "radar"){
    weatherEvent = "rainRadar/";
  }
  if (weatherEv === "severeWeather"){
    weatherEvent = "unwetter/";
  }

  $.ajax({
    // use a http GET request
    type: "GET",
    // URL to send the request to
    url: "/api/v1/previousWeather/" + weatherEvent + currentTimestamp,
    // type of the data that is sent to the server
    contentType: "application/json; charset=utf-8",
    // timeout set to 15 seconds
    timeout: 15000,

    success: function() {
      $('#information').html("Retrieving previous weather events");
    }
  })

  // if the request is done successfully, ...
  .done(function (result) {
    // ... give a notice on the console that the AJAX request for reading previous weather has succeeded
    console.log("AJAX request (reading previous weather) is done successfully.");

    resultOutput.push(result);
    let layerID;
    // for every timestamp
    for (let key in result) {
      if ((key != "type") && (key != "length") && (key != "radProd")) {
        // log the individual timestamp to refer to them later
        usedTimestamps.push(key);

        // for every warnings in the response
        for (let j = 0; j < result[key].length; j++){
          if (result[key][j].type === "Tweet") {
            layerID = "tweet " + key + " " + j;
            mask = {
              "timestamp": key,
              "type": weatherEvent,
              "geometry": {
                "type": "FeatureCollection",
              }
            };

            var tweet = {
              "type":"Feature",
              "properties": result[key][j],
              "geometry": result[key][j].location_actual
            };
            tweet.properties["class"] = key;

            mask.geometry.features = [tweet];
          } else {
            // take every warnings and save its coordinates
            let currentUnwetter = result[key][j].geometry;
            // gjson structure
            mask = {
              "timestamp": key,
              "type": weatherEvent,
              "geometry": {
                "type": "FeatureCollection",
              }
            };

            // put every polygon from a warning into one array
            if (weatherEv == "severeWeather") {

              // assigning warnings-type
              let layerGroup = "";
              let ii = result[key][j].properties.ec_ii;

              // if the current Unwetter is of type RAIN ...
              if ((ii >= 61) && (ii <= 66)) {
                layerGroup = "Rain";
              }
              // if the current Unwetter is of type SNOWFALL ...
              else if ((ii >= 70) && (ii <= 78)) {
                layerGroup = "Snowfall";
              }
              // if the current Unwetter is of type THUNDERSTORM ..
              else if (((ii >= 31) && (ii <= 49)) || ((ii >= 90) && (ii <= 96))) {
                layerGroup = "Thunderstorm";
              }
              // if the current Unwetter is of type BLACK ICE ..
              else if ((ii === 24) || ((ii >= 84) && (ii <= 87))) {
                layerGroup = "BlackIce";
              }
              else {
                // TODO: if-else if ohne else möglich??
              }

              layerID = "unwetter " + key + " " + j + " " + layerGroup;

              // also save the according weather event
              let currentProperties = result[key][j].properties;
              outputArray = [];
              for (let i = 0; i < currentUnwetter.length; i++) {
                //transform the polygon into geojson
                var polygon = goGeoJson(currentUnwetter[i].coordinates, key, currentProperties);
                // array to save every timestamp´s polygon
                outputArray.push(polygon);
              }
              mask.geometry.features = outputArray;
            }

            // add the current events to the geojson for each timestamp
            if (weatherEv == "radar") {


console.log(result);

              // TODO: hier auf product === "rw" zugreifen, testen ob funktioniert
              if (result) {
                showLegend(animationMap, "radar", "rw");
              }


              layerID = "radar " + key + " " + j;
              mask.geometry.features = currentUnwetter;
            }
          }
          customLayerIds.push(layerID);
          addToSource(map, layerID, mask);
        }
      }
    }

    // if the warnings shown are demodata
    if ((weatherEv === "severeWeather") && (currentTimestamp >= paramArray.config.demo.timestamp_start) && (currentTimestamp <= paramArray.config.demo.timestamp_end)) {
      let posAccuracy = document.getElementById("posAccuracy");
      posAccuracy.innerHTML = "<b>Positional accuracy of data:</b><br>Local authority borders<br>(does not count for all demodata)";
    }
  })

  // if the request has failed, ...
  .fail(function (xhr, status, error) {
    // ... give a notice that the AJAX request for reading previous weather has failed and show the error on the console
    console.log("Reading previous weather has failed.", error);

    // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
    if (error === "timeout") {
      JL("ajaxReadingPreviousWeatherTimeout").fatalException("ajax: '/previousWeather/weatherEvent/currentTimestamp' timeout");
    }
    // TODO: testen, ob so richtig
    else {
      JL("ajaxReadingPreviousWeatherError").fatalException(error);
    }
  });
}


/**
* @desc Function to return a GeoJSON formatted Polygon.
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
* @param object - the individual polygons of an event, containing the coords of a polygon
* @param time - timestamp of the data
* @param properties - properties of the event
*/
function goGeoJson(object, time, properties) {

  var result = {
    "type":"Feature",
    "properties": properties,
    "geometry": {
      "type":"Polygon",
      "coordinates": object[0]
    }
  };
  result.properties["class"] = time;
  return result;
}


/**
* @desc Checks if a part of an Object is already in an array.
* @param item geojson object
* @author Benjamin Rieke
*/
function addItem(item) {
  var index = timestampStorage.findIndex(x => x.timestamp == item.timestamp);
  if (index === -1) {
    timestampStorage.push(item);
  } else {
    console.log("Object already exists.");
  }
}


/**
* @desc removes all weather sources and layers from the map on wtype change
* @param {Object} map - mapbox-map
* @author Benjamin Rieke
*/
function removeAllSource(map) {
  var sources = map.style.sourceCaches;
  var layers = map.getStyle().layers;

  for (let key in sources){
    // checks if the sources contain a numbered id
    if (key.includes("unwetter") || key.includes("rainradar") || key.includes("Tweet") ){

      // if they are already in the layers
      for (let lays in layers){
        if(layers[lays].id == key){
          //remove them
          map.removeLayer(key);
        }
      }
      map.removeSource(key);
    }
  }
}


/**
* @desc Adds a GEOJSON to the map as a source.
* @param {Object} map - links to the mapbox-map
* @param layerID to be id of the source. in this case the timestamp
* @param previousFeatureCollection the geojson featurecollection
* @author Benjamin Rieke
*/
function addToSource(map, layerID, previousFeatureCollection){
  //
  let sourceObject = map.getSource(layerID);
  // if there is already an existing Source of this map with the given layerID ...
  if (typeof sourceObject !== 'undefined') {
    // ... add the data
    // TODO: warum folgendes nötig? warum nicht einfach alte source unverändert lassen, da dwd-id die gleiche ist und damit auch keine updates des Unwetters vorhanden sind?
    let data = JSON.parse(JSON.stringify(sourceObject._data));
    data.features = data.features.concat(previousFeatureCollection.geometry.features);
    sourceObject.setData(data);

    // if there is no Source of this map with the given layerID ...
  } else {
    if (previousFeatureCollection.type == "rainRadar/") {
      map.addSource(layerID, {
        type: 'geojson',
        data: previousFeatureCollection.geometry.features
      });
    }

    if (previousFeatureCollection.type == "unwetter/") {
      map.addSource(layerID, {
        type: 'geojson',
        data: previousFeatureCollection.geometry
      });
    }
  }
}
