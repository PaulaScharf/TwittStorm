# TwittStorm
TwittStorm for Geosoftware II
## Weblinks
The code of this project can be found on GitHub: [https://github.com/PaulaScharf/Geosoftware2-TwittStorm](https://github.com/PaulaScharf/Geosoftware2-TwittStorm)<br>
<br>
<b>TODO: DockerHub-Link einfügen</b>
## How to construct and use your own API-keys
#### Mapbox GL JS
1.
2.
3. set the value of the variable ``keys.mapbox.access_key`` in config.yaml to your own created API key

#### Twitter
1.
2.
3. set the value of the variable ``keys.twitter.consumer_key`` in config.yaml to your own created ....... API key
4. set the value of the variable ``keys.twitter.consumer_secret`` in config.yaml to your own created ....... API key
5. set the value of the variable ``keys.twitter.access_token_key`` in config.yaml to your own created ....... API key
6. set the value of the variable ``keys.twitter.access_token_secret`` in config.yaml to your own created ....... API key
<br><br>TODO: steps 3 to 6 evtl. als einen einzigen Punkt formatieren

## How to start the App
<b>TODO: DockerHub einfügen</b><br>
ANPASSEN:<br>
To start the application via docker, navigate to the app's folder in a dockershell and enter
``docker-compose up --build``<br/>
or as an alternative (if the command above does not work): ``docker-compose build`` and ``docker-compose up``.<br/>

The application can be found with your browser at your IP:port. E.g.: http://192.168.99.100:3000/.<br/>
Your IP will be shown on start of the dockershell.<br/>  

## How to test with JMeter
1. Download and install JMeter from here: https://jmeter.apache.org/download_jmeter.cgi  
(We used "apache-jmeter-5.2.1.zip")  
2. Download and install JMeter Plugins Manager: https://jmeter-plugins.org/wiki/PluginsManager/
3. Install the Selenium/Webserver plugin:  
    1. open JMeter
    2. go to options
    3. open Plugins Manager
    4. go to available plugins
    5. search for "Selenium/WebDriver Support" and install it
4. open the JMeter script (located in this repo at ``./test/Twittstorm.jmx``)
5. configure the WebDriver for chrome
    1. download chrome from here: https://www.google.com/intl/de_de/chrome/
    2. download ChromeDriver.exe from here: https://chromedriver.chromium.org/downloads  
    (we used "ChromeDriver **79**.0.3945.36", because we operate chrome version **79**)
    3. in JM open thread "client side tests"
    4. open "jp@gc - Chrome Driver Config"
    5. open tab "chrome"
    6. set the path to the location of the "chromedriver.exe" on your local system
6. start the test threads and look at the results in "View Results Tree", "Summary Report" and "Response Time Graph"

## Troubleshoot
Ensure that your adblocker does not prevent JSNLog from working.

## Information for Developers
<b>TODO: Config.yaml erklären hier, oder auf Wiki verweisen?</b><br>
