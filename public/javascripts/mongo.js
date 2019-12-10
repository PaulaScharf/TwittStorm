// jshint esversion: 8
// tutorial


/*
R("ex-async.R")
.call(function(err,d) {
  if (err) throw err;
  console.log(d);
});
*/
/*
$.get("https://maps.dwd.de/geoserver/dwd/wms?service=WMS&version=1.1.0&request=GetMap&layers=dwd%3AFX-Produkt&bbox=-523.462%2C-4658.645%2C376.538%2C-3758.645&width=767&height=768&srs=EPSG%3A1000001&format=image%2Fpng", function(data) {
  console.log("got wms png");
  //TODO move to users.js
  var buf = Buffer.from(data);
  console.log(buf);
});
*/
// ############ show content of local instance of mongoDB #########
// on DOM ready
$(document).ready(function() {
	showRoutes();
});

//show routes
function showRoutes() {
	var tableContent = "";

	//get JSON
	$.getJSON('/db/routes', function(data) {
		routesArray = data;
		console.log(data);
		$.each(data, function(index) {
			tableContent += '<tr>';
			tableContent += '<td>' + JSON.stringify(this) + '</td>';
			tableContent += '<td><a href="#" class="linkdeleteroute" rel="' + this._id + '">Delete</a></td>';
			tableContent += '</tr>';
		});

		//put into html
		$('#routeTable').html(tableContent);
		$('#routeTable').on('click', 'td a.linkdeleteroute', deleteRoute);
	});
}

function deleteRoute(event) {
	event.preventDefault();

	$.ajax({
		type: 'DELETE',
		url: '/db/delete' + $(this).attr('rel')
	}).done(function(response) {
		if(response.msg === '') {
			alert('done!');
		}
		else {
			//alert('Error: ' + response.msg);
		}

		//update
		showRoutes();
	});
}

// ################# on button click, add element to DB for testing purposes ##################
//create
function createRouteButton() {
	event.preventDefault();
	let item = document.getElementById('GeoJson').value;
	console.dir(JSON.parse(item));

	//post
	$.ajax({
		type: 'POST',
		data: item,
		url: '/db/add',
		contentType:"application/json"
	}).done(function(response) {
		console.dir(response);
		//successful
		if(response.error === 0) {
			alert('route added: ' + response.msg);
		}
		else {
			alert('Error: ' + response.msg);
		}
	}).fail(function(error) {
		console.dir("ajax request (adding an item to the database) has failed", error.responseText)
	});
}
