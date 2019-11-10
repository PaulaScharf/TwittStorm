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


  // TODO: Folgendes als AJAX, wenn Datenbank steht

  // load the GeoJSON from the DWD Geoserver and display the current Unwetter-areas
  $.getJSON('https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=dwd%3AWarnungen_Gemeinden_vereinigt&maxFeatures=100&outputFormat=application%2Fjson', function(data) {
    // EPSG: 4326

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
    for (let i = 0; i < data.features.length; i++) {

      // FILTER:

      // use only the Unwetter which are observed and therefore certain, not just likely ...
      // TODO: BEOBACHTEN, OB OBSERVED AUSREICHT und zu Observed ändern!!
      // ... and use only the notifications that are actual reports and not just tests
      if ((data.features[i].properties.CERTAINTY === "Likely") && (data.features[i].properties.STATUS	=== "Actual")){

        // TODO: WEITERE MÖGLICHE FILTER
        //      data.features[i].properties.CERTAINTY === "Observed"
        //      data.features[i].properties.RESPONSETYPE
        //      data.features[i].properties.URGENCY === "Immediate"
        //      data.features[i].properties.SEVERITY === "Severe" || data.features[i].properties.SEVERITY === "Extreme"
        //      data.features[i].properties.HEADLINE beginnt mit "Amtliche UNWETTERWARNUNG"

        //      data.features[i].properties.ONSET       GIBT ANFANGSZEIT, AB WANN WARNUNG GILT
        //      data.features[i].properties.EXPIREs     GIBT ENDZEIT, BIS WANN WARNUNG GILT
        // für Zeitformat siehe:  https://www.dwd.de/DE/leistungen/opendata/help/warnungen/cap_dwd_profile_de_pdf.pdf?__blob=publicationFile&v=2

        // weitere Parameter in CAP-Doc, zB Altitude und Ceiling


        // *********************** FROST ***********************
        //
        if (data.features[i].properties.EVENT === 'FROST'){

          //
          unwetterFeature = {
            "type": "Feature",
            "geometry": data.features[i].geometry,
            "properties": data.features[i].properties
          };

          //
          frostFeaturesArray.push(unwetterFeature);
        }


        // *********************** WINDBÖEN ***********************
        //
        if (data.features[i].properties.EVENT === 'WINDBÖEN'){

          //
          let unwetterFeature = {
            "type": "Feature",
            "geometry": data.features[i].geometry,
            "properties": data.features[i].properties
          };

          //
          windboeenFeaturesArray.push(unwetterFeature);
        }


        // *********************** GLÄTTE ***********************
        //
        if (data.features[i].properties.EVENT === 'GLÄTTE'){

          //
          let unwetterFeature = {
            "type": "Feature",
            "geometry": data.features[i].geometry,
            "properties": data.features[i].properties
          };

          //
          glaetteFeaturesArray.push(unwetterFeature);
        }


        // *********************** SCHNEEFALL ***********************
        //
        if (data.features[i].properties.EVENT === 'LEICHTER SCHNEEFALL'){   // weitere Schneeevents hiNzufügen

          //
          let unwetterFeature = {
            "type": "Feature",
            "geometry": data.features[i].geometry,
            "properties": data.features[i].properties
          };

          //
          schneefallFeaturesArray.push(unwetterFeature);
        }
        // *********************** ????? ***********************
        // ...


      }
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

  });
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
      "fill-opacity": 0.3
    }
  });

  // https://github.com/mapbox/mapbox-gl-js/issues/908#issuecomment-254577133
  // https://docs.mapbox.com/help/how-mapbox-works/map-design/#data-driven-styles
  // https://docs.mapbox.com/help/tutorials/mapbox-gl-js-expressions/
}



/**
* @desc ...
* @author Katharina Poppinga
* @private
* @param {Object} e ...
*/
function showUnwetterPopup(e) {

  //
  var pickedUnwetter = map.queryRenderedFeatures(e.point);

  //
  if (pickedUnwetter[0].properties.INSTRUCTION !== "null") {
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML("<b>"+pickedUnwetter[0].properties.EVENT+"</b>" + "<br>" + pickedUnwetter[0].properties.DESCRIPTION + "<br><b>onset: </b>" + pickedUnwetter[0].properties.ONSET + "<br><b>expires: </b>" + pickedUnwetter[0].properties.EXPIRES + "<br>" + pickedUnwetter[0].properties.INSTRUCTION)
    .addTo(map);
  }

  //
  else {
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML("<b>"+pickedUnwetter[0].properties.EVENT+"</b>" + "<br>" + pickedUnwetter[0].properties.DESCRIPTION + "<br><b>onset: </b>" + pickedUnwetter[0].properties.ONSET + "<br><b>expires: </b>" + pickedUnwetter[0].properties.EXPIRES)
    .addTo(map);
  }

  //let sent = unwetterObj.properties.SENT; // TODO: daraus timestamp in brauchbarem format machen ODER onset und expires verwenden?!
}


// *****************************************************************************

// TODO: Popups poppen auch auf, wenn Nutzer-Polygon (Area of Interest) eingezeichnet wird. Das sollte besser nicht so sein?


// 2nd parameter: layerID
map.on('click', 'frost', function(e){
  //
  showUnwetterPopup(e);
});


// 2nd parameter: layerID
map.on('click', 'windboeen', function(e){
  //
  showUnwetterPopup(e);
});


// 2nd parameter: layerID
map.on('click', 'glaette', function(e){
  //
  showUnwetterPopup(e);
});


// 2nd parameter: layerID
map.on('click', 'schneefall', function(e){
  //
  showUnwetterPopup(e);
});



// *****************************************************************************

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
