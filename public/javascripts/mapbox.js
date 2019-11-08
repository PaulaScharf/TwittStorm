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


// specify and add a control for drawing a polygon into the map
var draw = new MapboxDraw({
  displayControlsDefault: false, // all controls to be off by default for self-specifiying the controls as follows
  controls: {
    polygon: true,
    trash: true // for deleting a drawn polygon
  }
});
map.addControl(draw);


//
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


  // load the GeoJSON from the DWD Geoserver and display the current Unwetter-areas
  $.getJSON('https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=dwd%3AWarnungen_Gemeinden_vereinigt&maxFeatures=100&outputFormat=application%2Fjson', function(data) {

    // EPSG::4326

    // get coordinates of .... ???
    //var coordinates = data.features[0].geometry.coordinates;
    // TODO: folgendes löschen, da zu Beginn Deutschland komplett und daher auch mittig gezeigt werden soll?
    //map.jumpTo({ 'center': coordinates[0][0][0], 'zoom': 5 });


    //
    for (let i = 0; i < data.features.length; i++) {

      // use only the Unwetter which are observed and therefore certain, not just likely
      // TODO: BEOBACHTEN, OB OBSERVED AUSREICHT und zu Observed ändern!!
      if (data.features[i].properties.CERTAINTY === "Likely"){

        let unwetterID = "";
        unwetterID = i.toString(); // unwetterID has to be a String because addSource() needs a String (it's called later on)

        var unwetterObj = data.features[i];

        // display the i-th Unwetter-area in the map
        displayUnwetter(unwetterID, unwetterObj);
      }
    }
  });
});


// TODO: entweder für alle events (windböen, gewitter etc.) je einen einzelnen layer
// oder für alle unwetter zusammen nur einen layer erstellen!!
// (nicht für jedes einzelne unwetter einen layer)
// https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/

/**
* @desc Displays the current Unwetter with the fitting event target.
* @author Benjamin Rieke, Katharina Poppinga
* @private
* @param unwetterID index for the Array of Unwetter given by the DWD
* @param unwetterObj a certain Unwetter (as JSON) of the response from the DWD
*/
function displayUnwetter(unwetterID, unwetterObj) {

  // add the given Unwetter as a source to the map
  map.addSource(unwetterID, {
    type: 'geojson',
    data: unwetterObj
  });

  console.log(unwetterObj.properties.EVENT);

  // add the given Unwetter as a layer to the map, in doing so fill its area with a the specific color regarding the event-type:
  //
  if (unwetterObj.properties.EVENT === 'WINDBÖEN'){
    map.addLayer({
      "id": unwetterID,
      "type": "fill",
      "source": unwetterID,
      'paint': {
        'fill-color': 'red',
        'fill-opacity': 0.5
      }
    });
  }
// alle Windböen in ein GeoJSON schreiben ??
/*
let windboeen;
windboeen = {
    type: "FeatureCollection",
    features: [
      // hier unwetterObj einfügen
      unwetterObj
    ]
  };
*/


  //
  if (unwetterObj.properties.EVENT === 'FROST'){
    map.addLayer({
      "id": unwetterID,
      "type": "fill",
      "source": unwetterID,
      'paint': {
        'fill-color': 'blue',
        'fill-opacity': 0.5
      }
    });
  }


  //
  if (unwetterObj.properties.EVENT === 'GLÄTTE'){
    map.addLayer({
      "id": unwetterID,
      "type": "fill",
      "source": unwetterID,
      'paint': {
        'fill-color': 'yellow',
        'fill-opacity': 0.5
      }
    });
  }


  // TODO:
  // ............. KÜRZEN UND FÜR ALLE EVENT-TYPES FARBEN FESTLEGEN

}



// TODO: FUER FOLGENDES MUSS AUCH EIN LAYER ANGEGEBEN WERDEN, DAFÜR WÄRE AUCH EIN LAYER FÜR ALLE UNWETTER ZUSAMMEN NÖTIG
// https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/

// change the cursor to a pointer when hovering the layer ...
map.on('mouseenter', 'LAYERID', function () {
map.getCanvas().style.cursor = 'pointer';
});

// change the cursor back to a hand when leaving the layer ...
map.on('mouseleave', 'LAYERID', function () {
map.getCanvas().style.cursor = '';
});




// PROBLEM: ONCLICK (ER-)KENNT NICHT DIE ANGEKLICKTEN POLYGONE UND DAHER NICHT DIE EINZELNEN UNWETTER
// 2. parameter ist die layerID
map.on('click', '1', function(e){

// unwetterObj hier nicht möglich!!!
  console.log(e);

  new mapboxgl.Popup()
  .setLngLat(e.lngLat)
  .setHTML(e.features[0].properties) // TODO: hier event-type und beschreibung einfügen, aber wie darauf zugreifen bei onclick?
  .addTo(map);



/*
  let description = unwetterObj.properties.DESCRIPTION;
  let sent = unwetterObj.properties.SENT; // TODO: daraus timestamp in brauchbarem format machen

  //
  new mapboxgl.Popup()
  .setText(unwetterObj.properties.EVENT) // hier auch description einfügen
  .addTo(map);
*/

});



// ************************ drawn polygons ************************
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
