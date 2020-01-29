# TwittStorm
TwittStorm for Geosoftware II (University of Münster, winter semester 2019/2020) by Jonathan Bahlmann, Katharina Poppinga, Paula Scharf and Benjamin Rieke.
## Weblinks
The code of this project is published on GitHub: [https://github.com/PaulaScharf/Geosoftware2-TwittStorm](https://github.com/PaulaScharf/Geosoftware2-TwittStorm)<br>
<br>
The corresponding Docker Repository can be found on Docker Hub: [https://hub.docker.com/r/paulasch/twittstorm](https://hub.docker.com/r/paulasch/twittstorm)

## How to start the App
Get three files from [TwittStorm-GitHub-Repository](https://github.com/PaulaScharf/Geosoftware2-TwittStorm):
- ``Dockerfile``
- ``docker-compose.yml``
- ``.env``    

Open ``.env`` and replace the XXX-placeholder for the values of all five given variables by your own API keys. See [How to get and use your own API-keys](https://github.com/PaulaScharf/TwittStorm/tree/master#how-to-get-and-use-your-own-api-keys) for information about how to create your API keys and where to insert which of them.<br/>
Then open a docker shell in the same directory and enter ``docker-compose up``.<br/>
The started application can be found with your browser at ``http://<your IP>:3000`` (e.g.: http://192.168.99.100:3000 on windows or http://localhost:3000 on ubuntu).<br/>

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
4. Open the JMeter script (located in this repo at ``./test/Twittstorm.jmx``)
5. Configure the WebDriver for Chrome
    1. download Chrome from here: https://www.google.com/intl/de_de/chrome/
    2. download ChromeDriver.exe from here: https://chromedriver.chromium.org/downloads  
    (we used "ChromeDriver **79**.0.3945.36", because we operate chrome version **79**)
    3. in JM open thread "client side tests"
    4. open "jp@gc - Chrome Driver Config"
    5. open tab "chrome"
    6. set the path to the location of the "chromedriver.exe" on your local system
6. Start the test threads and look at the results in "View Results Tree", "Summary Report" and "Response Time Graph"

## Troubleshoot
- Ensure that your adblocker does not prevent JSNLog from working.
- For the newest R packages, we use a repository which needs to be signed with a keyserver. Building a docker image locally, we experienced some keyserver unavailabilities. Using a prebuilt image from Docker Hub (the intended use as described in this readme) we did not run into this problem. Please just be aware that that could be an issue, especially when working locally. In the case of an error remain patient and try again.

## Information for Developers
When using the image from Docker Hub, the configuration possibilities are limited. If you want to configure some aspects as it is specified in our [Configuration Wiki](https://github.com/PaulaScharf/TwittStorm/wiki/Configuration), you need to clone the [GitHub Repository](https://github.com/PaulaScharf/Geosoftware2-TwittStorm), edit the ``config.yaml`` and build your own local image.
