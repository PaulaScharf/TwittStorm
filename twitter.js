
/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/


var Twitter = require('twitter');

var client = new Twitter({
  consumer_key: 'MrvR3iGRtOYWEHvyX1GQvbgbn',
  consumer_secret: '8fDd8OEVcklCC4a0JdWa5P7dOC3J3p029jhFSITbwmDwnVN8CA',
  access_token_key: '1186999137541283840-8t6BUIDVX9it9aZznjRX7QmIduO4dw',
  access_token_secret: 'W9b9MvmH93UTbiTcEMr1h2IBqLc2lQfF3LtqphfdeReJK'
});

client.stream('statuses/filter', {track: 'jesus'}, function(stream) {
  stream.on('data', function(event) {
    console.log(event && event.text);
  });

  stream.on('error', function(error) {
    throw error;
  });
});
