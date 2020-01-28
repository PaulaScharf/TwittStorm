# TwittStorm
TwittStorm for Geosoftware II
## Weblinks
The code of this project is published on GitHub: [https://github.com/PaulaScharf/Geosoftware2-TwittStorm](https://github.com/PaulaScharf/Geosoftware2-TwittStorm)<br>
<br>
The corresponding Docker Repository can be found on Docker Hub: [https://hub.docker.com/r/paulasch/twittstorm](https://hub.docker.com/r/paulasch/twittstorm)

## How to start the App
Get three files from [TwittStorm-GitHub-Repository](https://github.com/PaulaScharf/Geosoftware2-TwittStorm):
- ``Dockerfile``
- ``docker-compose.yml``
- ``.env``    

Open ``.env`` and set ........... to your own API keys. See [How to get and use your own API-keys](https://github.com/PaulaScharf/TwittStorm/tree/master#how-to-get-and-use-your-own-api-keys) for information about how to create your API keys.<br/>
Then open the docker shell in the same directory and enter ``docker-compose up``.<br/>
The started application can be found with your browser at `http://<your IP>:3000`. E.g.: http://192.168.99.100:3000/.<br/>
Your IP will be shown on start of the dockershell (TODO: wann, nicht bei allen?).<br/>  

<br>
TODO: falls Docker Hub Image genutzt wird, sind config-Möglichkeiten (abgesehen von API-keys) nicht gegeben, dazu wäre GitHub clone und lokales bauen nötig, damit vorher die config.yaml angepasst werden kann - ODER: config.yaml noch in .env ändern!
<br>


## How to get and use your own API-keys
In order to use this app, you have to sign up for the necessary services. You'll need a mapbox access key for the map, and a twitter developer account with keys in order to access real-time twitter data.
#### Mapbox GL JS
1. First you will need a Mapbox account. If you are not signed up yet you should go to https://account.mapbox.com/auth/signup/ and create an account. All you need for this process is a valid email address.
2. After validating your email check out https://account.mapbox.com/access-tokens/. Here you will find your own default token.
3. Set the value of the variable ``MAPBOX_ACCESS_KEY`` in ``.env`` to your default token.

#### Twitter
1. If you don't already have one, please create a twitter account. This can be done by downloading and opening the moible app or through the web at https://twitter.com.
2. You'll need to register as a developer. This can be done here: https://developer.twitter.com/en/apply-for-access. You're only going to get and display twitter data, so you can disable all other options in the "how are you going to use twitter"-form.
3. Create an app at https://developer.twitter.com/en/apps (accessible only with an account). You can name this app whatever you like.
4. You can see and copy the tokens you'll need from the "Keys and tokens" section in the overview of the app you just created.
5. Set the value of the variable ``TWITTER_CONSUMER_KEY`` in ``.env`` to your own "API key".
6. Set the value of the variable ``TWITTER_CONSUMER_SECRET`` in ``.env`` to your own "API secret key".
7. Set the value of the variable ``TWITTER_ACCESS_TOKEN_KEY`` in ``.env`` to your own created "access token".
8. Set the value of the variable ``TWITTER_ACCESS_TOKEN_SECRET`` in ``.env`` to your own created "access token secret".

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
<b>TODO: keyserver Probleme nennen</b><br>
Ensure that your adblocker does not prevent JSNLog from working.

## Information for Developers
See our [Configuration Wiki](https://github.com/PaulaScharf/TwittStorm/wiki/Configuration) for information about what you are able to configurate in ``config.yaml``.
<br><b>TODO: (EVTL. ANPASSEN WG. .ENV).<br>
