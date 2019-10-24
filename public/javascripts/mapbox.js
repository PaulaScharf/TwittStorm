mapboxgl.accessToken = 'pk.eyJ1Ijoib3VhZ2Fkb3Vnb3UiLCJhIjoiY2pvZTNodGRzMnY4cTNxbmx2eXF6czExcCJ9.pqbCaR8fTaR9q1dipdthAA';
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-v9',
  zoom: 4,
  center: [10.4, 51], // starting position [lng, lat]

});

map.on('load', function () {
  // Loads the GEOJSON from the DWD Geoserver and displays the current Unwetterareas
  https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=dwd%3AWarnungen_Gemeinden_vereinigt&maxFeatures=50&outputFormat=application%2Fjson
  $.getJSON('https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=dwd%3AWarnungen_Gemeinden_vereinigt&maxFeatures=50&outputFormat=application%2Fjson', function(data) {

//get coordinates
    var coordinates = data.features[0].geometry.coordinates;
  //  console.log(coordinates);
    console.log(data.features[0].properties);
    map.jumpTo({ 'center': coordinates[0][0][0], 'zoom': 4 });


    // add it to the map
    map.addSource('unwetter', { type: 'geojson', data: data });
    map.addLayer({
      "id": "unwetter",
      "type": "fill",
      "source": "unwetter",
      'paint': {
'fill-color': 'blue',
'fill-opacity': 0.6
}

    });


  });
});
