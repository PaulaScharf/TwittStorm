mapboxgl.accessToken = 'pk.eyJ1Ijoib3VhZ2Fkb3Vnb3UiLCJhIjoiY2pvZTNodGRzMnY4cTNxbmx2eXF6czExcCJ9.pqbCaR8fTaR9q1dipdthAA';
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-v9',
  zoom: 4,
  center: [10.4, 51], // starting position [lng, lat]

});

map.on('load', function () {
  // Loads the GEOJSON from the DWD Geoserver and displays the current Unwetterareas
  $.getJSON('https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=dwd%3AWarnungen_Gemeinden_vereinigt&maxFeatures=50&outputFormat=application%2Fjson', function(data) {

//get coordinates
    var coordinates = data.features[0].geometry.coordinates;
    map.jumpTo({ 'center': coordinates[0][0][0], 'zoom': 4 });

  //  console.log(coordinates);
    //console.log(data.features.length);
    for (let i=0; i < data.features.length; i++) {
      var unwetterId = "";
    unwetterId = i.toString();
      var color;
    var r = Math.floor(Math.random() * 255);
    var g = Math.floor(Math.random() * 255);
    var b = Math.floor(Math.random() * 255);
    color= "rgb("+r+" ,"+g+","+ b+")";
    //console.log(i);
    //console.log(unwetterId);

var output = data.features[i];
//console.log(output);

displayUnwetter(unwetterId, output, color);


}});
});


/**
*@desc displays the current unwetters with the fitting event target
*@author Benjamin Rieke
*@param unwetterID index for the JSON file
*@param output the given JSON response
*@param color a random color
*/

function displayUnwetter (unwetterId, output, color) {
  console.log(output.properties.EVENT);
  // Change for desired weather event
if (output.properties.EVENT == 'WINDBÖEN' ||'STURMBÖEN'){
    // add it to the map
    map.addSource(unwetterId, { type: 'geojson', data: output});

    map.addLayer({
      "id": unwetterId,
      "type": "fill",
      "source": unwetterId,
      'paint': {
'fill-color': color,
'fill-opacity': 0.6
}



});

var popup = new mapboxgl.Popup({ offset: 25 })
.setText(output.properties.EVENT);

var marker = new mapboxgl.Marker({className: 'my-class', color: 'gray'})
  .setLngLat(output.geometry.coordinates[0][0][0])
  .setPopup(popup)
  .addTo(map);


}
}
