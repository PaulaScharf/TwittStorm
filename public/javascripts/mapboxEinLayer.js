// jshint esversion: 6
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware2, WiSe2019/2020
* @author name: Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
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

    // one feature for a single Unwetter (could be FROST, WINDBÖEN, ...)
    let unwetterFeature;

    // all Unwetter-features
    let allUnwetterFeaturesArray = [];

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


          //
          unwetterFeature = {
            "type": "Feature",
            "geometry": data.features[i].geometry,
            "properties": data.features[i].properties
          };

          //
          allUnwetterFeaturesArray.push(unwetterFeature);

      }
    }

    // make one GeoJSON-FeatureCollection for all Unwetter and display the Unwetter in the map:
    //
    var unwetterFeaturesGeoJSON = {
      "type": "FeatureCollection",
      "features": allUnwetterFeaturesArray
    };
    displayAllUnwetter(unwetterFeaturesGeoJSON);

/*
    let colorMap = {
      "FROST" : "blue",
      "WINDBÖEN" : "red",
      "GLÄTTE" : "yellow"
    };

    //let farbe = colorMap[unwetterFeaturesGeoJSON.features[].properties["EVENT"]];
*/

  });
});



// HIER: für alle unwetter zusammen nur einen layer erstellen (dies schwierig wg. unterschiedlicher Einfärbung innerhalb eines layers -> data-driven-styles)
// (nicht für jedes einzelne unwetter einen eigenen layer und auch nicht für jeden event-type (windböen, gewitter etc.) je einen einzelnen layer)
// https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/
/**
* @desc Displays the ........ in the map.
* @author Benjamin Rieke, Katharina Poppinga
* @private
* @param {Object} unwetterFeatureCollection GeoJSON-FeatureCollection of all Unwetter-events of a specific event-type
*/
function displayAllUnwetter(unwetterFeatureCollection) {

  console.log(unwetterFeatureCollection);

  // add the given Unwetter-event as a source to the map
  map.addSource("Unwetter", {
    type: 'geojson',
    data: unwetterFeatureCollection
  });


  let layerSpecs = {
    "id": "Unwetter",
    "type": "fill",
    "source": "Unwetter",
    "paint": {
      "fill-color": "red",
      "fill-opacity": 0.5
    }
};

// PROBLEM: DATA-DRIVEN STYLE SO NICHT MÖGLICH, DA EINZELNE WERTE INNERHALB DES FEATURES-ARRAY VERSTECKT SIND
/*
map.addLayer({
  "id": "Unwetter",
  "type": "fill",
  "source": "Unwetter",
  "paint": {
    "fill-color": [
      "match", ["string", ["get", "unwetterFeatureCollection.features[].properties.EVENT"]],
        "FROST",
        "blue",
        "WINDBÖEN",
        "red",
        "GLÄTTE",
        "yellow",
        "white" // sonstiges Event
    ],
    "fill-opacity": 0.5
  }
});
*/

// add the given Unwetter-event as a layer to the map
map.addLayer(layerSpecs);


  // https://github.com/mapbox/mapbox-gl-js/issues/908#issuecomment-254577133
  // https://docs.mapbox.com/help/how-mapbox-works/map-design/#data-driven-styles
  // https://docs.mapbox.com/help/tutorials/mapbox-gl-js-expressions/
}




// https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/

// change the cursor to a pointer when hovering the layer ...
map.on('mouseenter', 'Unwetter', function () {
  map.getCanvas().style.cursor = 'pointer';
});
// change the cursor back to a hand when leaving the layer ...
map.on('mouseleave', 'Unwetter', function () {
  map.getCanvas().style.cursor = '';
});




// TODO: PROBLEM: wie hier auf spezifisches unwetter zugreifen, wie spezifisches polygon anwählen?
// 2nd parameter: layerID
map.on('click', 'Unwetter', function(e){

  console.log(e);

  new mapboxgl.Popup()
  .setLngLat(e.lngLat)
  .setHTML("Unwetter") // TODO: hier auch beschreibung und instruction einfügen, aber wie darauf zugreifen bei onclick?
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
