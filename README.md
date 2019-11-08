# Twittstorm
Twittstorm for Geosoft II
## Weblinks
The code of this project can be found on github: [https://github.com/PaulaScharf/Geosoftware2-TwittStorm](https://github.com/PaulaScharf/Geosoftware2-TwittStorm)
## Routes
Are in the routes folder in the index.js. The crud functionality is provided through the users.js in the same folder
## Pages
The Webpages are in the views folder and are in the .ejs format which can be used just like HTML
## CRUD
The CRUD functionality is based on the solution for geosoft1 and still uses the format that was used for that task. can be changed once
we know what we need to use it for
## Mapbox VS. Leaflet
The visualization of the Unwetterdata from the DWD works for both maps. Right now I have the feeling that Mapbox offers cooler and easier
ways to display our data
## How to set things up
To start the application via npm navigate to the app´s folder, open your commandprompt and enter <br/>
`npm install`
`npm start` or `nodemon start` for dynamic changes <br/>
The application can be found with your browser at http://localhost:3000 <br/>
To start the application via docker navigate to the app´s folder, open your commandprompt and enter
`docker-compose up`
The application can be found with your browser at http://192.168.99.100:3000/
## Tests
merging test
