// jshint esversion: 6

// Adds Leaflet Map with view of Germany
var start_latlng = [51, 10.4];

var leafMap = L.map("mapdiv").setView(start_latlng, 6);

var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'EEEEEESRI Motherfuckers'
}).addTo(leafMap);



var unwetterPoly = new L.geoJson();
unwetterPoly.addTo(leafMap);
// Adds the current Unwetterwarnungen to the map
$.ajax({
dataType: "json",
url: "https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=dwd%3AWarnungen_Gemeinden_vereinigt&maxFeatures=50&outputFormat=application%2Fjson",
success: function(data) {
    $(data.features).each(function(key, data) {
        unwetterPoly.addData(data);
    });
}
}).error(function() {
	
});
