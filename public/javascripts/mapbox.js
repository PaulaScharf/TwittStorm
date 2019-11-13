// jshint esversion: 6
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
 * @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
 * @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
 */

// please put in your own tokens at ???


// TODO: in tokens-Datei auslagern
mapboxgl.accessToken = 'pk.eyJ1Ijoib3VhZ2Fkb3Vnb3UiLCJhIjoiY2pvZTNodGRzMnY4cTNxbmx2eXF6czExcCJ9.pqbCaR8fTaR9q1dipdthAA';


// ****************************** global variables *****************************

/**
 *
 * @type {Object}
 */
//let unwetterObj;

// *****************************************************************************



// create a new map in the "map"-div
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-v9',
  // TODO: basemap durch Nutzer änderbar machen: https://docs.mapbox.com/mapbox-gl-js/example/setstyle/
  // style: 'mapbox://styles/mapbox/satellite-v9',
  // style: 'mapbox://styles/mapbox/streets-v11',
  zoom: 5, // TODO: überprüfen, ob diese Zoomstufe auf allen gängigen Bildschirmgrößen Deutschland passend zeigt
  center: [10.5, 51.2], // starting position [lng, lat]: center of germany
});


// add zoom and rotation controls to the map
map.addControl(new mapboxgl.NavigationControl());
// TODO: pan-Button fehlt noch


// specify and add a control for DRAWING A POLYGON into the map
var draw = new MapboxDraw({
  displayControlsDefault: false, // all controls to be off by default for self-specifiying the controls as follows
  controls: {
    polygon: true,
    trash: true // for deleting a drawn polygon
  }
});
map.addControl(draw);


// thie event is fired immediately after all necessary resources have been downloaded and the first visually complete rendering of the map has occurred
map.on('load', function() {
  // for a better orientation, add the boundary of germany to the map
  map.addLayer({
    'id': 'boundaryGermany',
    'type': 'line',
    'source': {
      'type': 'geojson',
      'data': boundaryGermany
    },
    'layout': { // TODO: nachlesen, ob layout hier nötig: https://docs.mapbox.com/mapbox-gl-js/style-spec/#types-layout
      'line-join': 'round',
      'line-cap': 'round'
    },
    'paint': {
      // TODO: passende Farbe aussuchen und bei basemap-Änderung anpassen
      'line-color': '#ffffff',
      'line-width': 1
    }
  });

  saveAndReturnNewTweetsThroughSearch()
      .catch(console.error)
      .then(function(result) {
        console.log(result);
      });
/*
  // ".then" is used here, to ensure that the asynchronos call has finished and a result is available
  saveAndReturnNewUnwetterFromDWD()
      .catch(console.error)
      .then(function(result) {
    let allUnwetter = result;

    let unwetterID = ""; // unwetterID has to be a String because addSource() needs a String (it's called later on)

    // one feature for a Unwetter (could be FROST, WINDBÖEN, ...)
    let unwetterFeature;


    // **************** EVENT-TYPES UNTERSCHEIDEN ****************
    //
    let frostFeaturesArray = [];

    //
    let windboeenFeaturesArray = [];

    //
    let glaetteFeaturesArray = [];

    //
    let schneefallFeaturesArray = [];

    // ***********************************************************


    // iteration over all Unwetter given in the DWD-response
    for (let i = 0; i < allUnwetter.length; i++) {

      // FILTER:

      // *********************** FROST ***********************
      //
      if (allUnwetter[i].properties.name === 'FROST') {

        //
        unwetterFeature = {
          "type": "Feature",
          "geometry": allUnwetter[i].geometry,
          "properties": allUnwetter[i].properties
        };

        //
        frostFeaturesArray.push(unwetterFeature);
      }


      // *********************** WINDBÖEN ***********************
      //
      if (allUnwetter[i].properties.name === 'WINDBÖEN') {

        //
        let unwetterFeature = {
          "type": "Feature",
          "geometry": allUnwetter[i].geometry,
          "properties": allUnwetter[i].properties
        };

        //
        windboeenFeaturesArray.push(unwetterFeature);
      }


      // *********************** GLÄTTE ***********************
      //
      if (allUnwetter[i].properties.name === 'GLÄTTE') {

        //
        let unwetterFeature = {
          "type": "Feature",
          "geometry": allUnwetter[i].geometry,
          "properties": allUnwetter[i].properties
        };

        //
        glaetteFeaturesArray.push(unwetterFeature);
      }


      // *********************** SCHNEEFALL ***********************
      //
      if (allUnwetter[i].properties.name === 'LEICHTER SCHNEEFALL') {   // weitere Schneeevents hiNzufügen

        //
        let unwetterFeature = {
          "type": "Feature",
          "geometry": allUnwetter[i].geometry,
          "properties": allUnwetter[i].properties
        };

        //
        schneefallFeaturesArray.push(unwetterFeature);
      }
      // *********************** ????? ***********************
      // ...

    }

    // make one GeoJSON-FeatureCollection for every event-type and display its Unwetter-events in the map:
    //
    var frostFeaturesGeoJSON = {
      "type": "FeatureCollection",
      "features": frostFeaturesArray
    };
    displayUnwetterEvent("frost", frostFeaturesGeoJSON, "blue");

    //
    var windboeenFeaturesGeoJSON = {
      "type": "FeatureCollection",
      "features": windboeenFeaturesArray
    };
    displayUnwetterEvent("windboeen", windboeenFeaturesGeoJSON, "red");

    //
    var glaetteFeaturesGeoJSON = {
      "type": "FeatureCollection",
      "features": glaetteFeaturesArray
    };
    displayUnwetterEvent("glaette", glaetteFeaturesGeoJSON, "yellow");

    //
    var schneefallFeaturesGeoJSON = {
      "type": "FeatureCollection",
      "features": schneefallFeaturesArray
    };
    displayUnwetterEvent("schneefall", schneefallFeaturesGeoJSON, "white");
  }, function(err) {
    console.log(err);
  });
  */
});





// HIER: für jeden event-type (windböen, gewitter etc.) je einen einzelnen layer
// (nicht für jedes einzelne unwetter einen eigenen layer und auch nicht für alle unwetter zusammen nur einen layer)
// https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/
/**
 * @desc Displays the ........ in the map.
 * @author Benjamin Rieke, Katharina Poppinga
 * @private
 * @param {String} unwetterID ID for the Unwetter-event-type
 * @param {Object} unwetterEventFeatureCollection GeoJSON-FeatureCollection of all Unwetter-events of a specific event-type
 * @param color color in which the corresponding polygons in the map will be colored
 */
function displayUnwetterEvent(unwetterID, unwetterEventFeatureCollection, color) {

  console.log(unwetterEventFeatureCollection);

  // add the given Unwetter-event as a source to the map
  map.addSource(unwetterID, {
    type: 'geojson',
    data: unwetterEventFeatureCollection
  });

  // add the given Unwetter-event as a layer to the map
  map.addLayer({
    "id": unwetterID,
    "type": "fill",
    "source": unwetterID,
    "paint": {
      "fill-color": color,
      "fill-opacity": 0.5
    }
  });

  // https://github.com/mapbox/mapbox-gl-js/issues/908#issuecomment-254577133
  // https://docs.mapbox.com/help/how-mapbox-works/map-design/#data-driven-styles
  // https://docs.mapbox.com/help/tutorials/mapbox-gl-js-expressions/

}




// https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/

// change the cursor to a pointer when hovering the layer ...
map.on('mouseenter', 'frost', function () {
  map.getCanvas().style.cursor = 'pointer';
});
// change the cursor back to a hand when leaving the layer ...
map.on('mouseleave', 'frost', function () {
  map.getCanvas().style.cursor = '';
});


// change the cursor to a pointer when hovering the layer ...
map.on('mouseenter', 'windboeen', function () {
  map.getCanvas().style.cursor = 'pointer';
});
// change the cursor back to a hand when leaving the layer ...
map.on('mouseleave', 'windboeen', function () {
  map.getCanvas().style.cursor = '';
});


// change the cursor to a pointer when hovering the layer ...
map.on('mouseenter', 'glaette', function () {
  map.getCanvas().style.cursor = 'pointer';
});
// change the cursor back to a hand when leaving the layer ...
map.on('mouseleave', 'glaette', function () {
  map.getCanvas().style.cursor = '';
});


// change the cursor to a pointer when hovering the layer ...
map.on('mouseenter', 'schneefall', function () {
  map.getCanvas().style.cursor = 'pointer';
});
// change the cursor back to a hand when leaving the layer ...
map.on('mouseleave', 'schneefall', function () {
  map.getCanvas().style.cursor = '';
});



// TODO: PROBLEM: wie hier auf spezifisches unwetter zugreifen, wie spezifisches polygon anwählen?
// 2nd parameter: layerID
map.on('click', 'frost', function(e){

  console.log(e);

  new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("Frost") // TODO: hier auch beschreibung und instruction einfügen, aber wie darauf zugreifen bei onclick?
      .addTo(map);

  /*
    let description = unwetterObj.properties.DESCRIPTION;   // für Infobox
    let instruction = unwetterObj.properties.INSTRUCTION;   // für Infobox
    let sent = unwetterObj.properties.SENT; // TODO: daraus timestamp in brauchbarem format machen ODER onset und expires verwenden?!
  */
});



// TODO: PROBLEM: wie hier auf spezifisches unwetter zugreifen, wie spezifisches polygon anwählen?
// 2nd parameter: layerID
map.on('click', 'windboeen', function(e){

  console.log(e);

  new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("Windböen") // TODO: hier auch beschreibung und instruction einfügen, aber wie darauf zugreifen bei onclick?
      .addTo(map);

  /*
    let description = unwetterObj.properties.DESCRIPTION;   // für Infobox
    let instruction = unwetterObj.properties.INSTRUCTION;   // für Infobox
    let sent = unwetterObj.properties.SENT; // TODO: daraus timestamp in brauchbarem format machen ODER onset und expires verwenden?!
  */
});



// TODO: PROBLEM: wie hier auf spezifisches unwetter zugreifen, wie spezifisches polygon anwählen?
// 2nd parameter: layerID
map.on('click', 'glaette', function(e){

  console.log(e);

  new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("Glätte") // TODO: hier auch beschreibung und instruction einfügen, aber wie darauf zugreifen bei onclick?
      .addTo(map);

  /*
    let description = unwetterObj.properties.DESCRIPTION;   // für Infobox
    let instruction = unwetterObj.properties.INSTRUCTION;   // für Infobox
    let sent = unwetterObj.properties.SENT; // TODO: daraus timestamp in brauchbarem format machen ODER onset und expires verwenden?!
  */
});



// TODO: PROBLEM: wie hier auf spezifisches unwetter zugreifen, wie spezifisches polygon anwählen?
// 2nd parameter: layerID
map.on('click', 'schneefall', function(e){

  console.log(e);

  new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("Schneefall") // TODO: hier auch beschreibung und instruction einfügen, aber wie darauf zugreifen bei onclick?
      .addTo(map);

  /*
    let description = unwetterObj.properties.DESCRIPTION;   // für Infobox
    let instruction = unwetterObj.properties.INSTRUCTION;   // für Infobox
    let sent = unwetterObj.properties.SENT; // TODO: daraus timestamp in brauchbarem format machen ODER onset und expires verwenden?!
  */
});




// ************************ events for drawn polygons ************************
// https://github.com/mapbox/mapbox-gl-draw/blob/master/docs/API.md

// if a polygon is drawn ...
map.on('draw.create', function (e) {
  console.log("drawnPolygons-created:");
  console.log(e.features);
  // all currently drawn polygons
  let drawnPolygons = draw.getAll();
  console.log("all drawnPolygons:");
  console.log(drawnPolygons);

  // coordinates of the first [0] polygon
  //let coordinatesFirstPolygon = drawnPolygons.features[0].geometry.coordinates;

  let indexLastPolygon = drawnPolygons.features.length - 1;

  // coordinates of the firstlast polygon
  let coordinatesLastPolygon = drawnPolygons.features[indexLastPolygon].geometry.coordinates;
  console.log("coordinatesLastPolygon:");
  console.log(coordinatesLastPolygon);

  // TODO: mit coordinatesLastPolygon in Funktion für die Tweed-Suche gehen
});


// TODO: Absprechen, was passieren soll, wenn mehrere Polygone eingezeichnet werden

// if a polygon is deleted ...
map.on('draw.delete', function (e) {
  console.log("drawnPolygons-deleted:");
  console.log(e.features);
});


// if a polygon is updated ...
map.on('draw.update', function (e) {
  console.log("drawnPolygons-updated:");
  console.log(e.features);
});


// if a polygon is selected or deselected ...
map.on('draw.selectionchange', function (e) {
  console.log("drawnPolygons-selectionchanged:");
  console.log(e.features);
});

// ****************************************************************
