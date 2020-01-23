# TwittStorm
TwittStorm for Geosoftware II
## Weblinks
The code of this project can be found on GitHub: [https://github.com/PaulaScharf/Geosoftware2-TwittStorm](https://github.com/PaulaScharf/Geosoftware2-TwittStorm)<br>
<br>
<b>TODO: DockerHub-Link einfügen</b>
## How to construct and use your own API-keys
#### Mapbox GL JS
...
#### Twitter
...
## How to start the App
<b>TODO: DockerHub einfügen</b><br>
ANPASSEN:<br>
To start the application via docker, navigate to the app's folder in a dockershell and enter
`docker-compose up --build`<br/>
or as an alternative (if the command above does not work): `docker-compose build` and `docker-compose up`.<br/>

The application can be found with your browser at your IP:port. E.g.: http://192.168.99.100:3000/.<br/>
Your IP will be shown on start of the dockershell.<br/>  

## How to test with Jmeter
1. Download and install JMeter from here: https://jmeter.apache.org/download_jmeter.cgi  
(We used "apache-jmeter-5.2.1.zip")  
2. Download and install JMeter Plugins Manager: https://jmeter-plugins.org/wiki/PluginsManager/
3. Install the Selenium/Webserver plugin:  
    1. open JMeter
    2. go to options
    3. open Plugins Manager
    4. go to available plugins
    5. search for "Selenium/WebDriver Support" and install it
4. open the JMeter script (located in this repo at ```./test/Twittstorm.jmx```)
5. configure the WebDriver for chrome
    1. download chrome from here: https://www.google.com/intl/de_de/chrome/
    2. download ChromeDriver.exe from here: https://chromedriver.chromium.org/downloads  
    (we used "ChromeDriver **79**.0.3945.36", because we operate chrome version **79**)
    3. in JM open "main page (client side, with AOI)"
    4. open "jp@gc - Chrome Driver Config"
    5. open tab "chrome"
    6. set the path to the location of the "chromedriver.exe" on your local system
6. start the test threads and look at the results in "View Results Tree", "Summary Report" and "Response Time Graph"

## Information for Developers
<b>TODO: Config.yaml erklären</b><br>

## Routes
Are in the routes folder in the index.js. The crud functionality is provided through the data.js in the same folder.
## Pages
The Webpages are in the views folder and are in the .ejs format which can be used just like HTML.
