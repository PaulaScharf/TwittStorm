// jshint esversion: 6
// tutorial
// routes array to store JSON data
var routesArray = [];

// on DOM ready
$(document).ready(function() {
  showRoutes();
});

//show routes
function showRoutes() {
  var tableContent = "";

  //get JSON
  $.getJSON('/users/routes', function(data) {
    routesArray = data;
    console.log(data);
    $.each(data, function(index) {
      if (routesArray[index].features[0].geometry.type  == "LineString"  ) {
      tableContent += '<tr>';
      tableContent += '<td>' + index + '</td>';
      tableContent += '<td>' + this.name + '</td>';
      tableContent += '<td>' + this.routeType + '</td>';
      tableContent += '<td>' + this.username + '</td>';
      tableContent += '<td>' + this.date + '</td>';
      tableContent += '<td>' + this.desc + '</td>';
      tableContent += '<td><a href="#" class="linkdeleteroute" rel="' + this._id + '">Delete</a></td>';
      tableContent += '</tr>';
    }});

    //put into html
    $('#routeTable').html(tableContent);
    $('#routeTable').on('click', 'td a.linkdeleteroute', deleteRoute);
  });
}

function deleteRoute(event) {
  event.preventDefault();

    $.ajax({
      type: 'DELETE',
      url: '/users/deleteroute/' + $(this).attr('rel')
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
