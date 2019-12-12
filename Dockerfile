FROM rocker/geospatial:latest

# create workdir
WORKDIR /usr/src/app

# copy package(-lock).json
COPY package*.json ./

# install dependencies
RUN apt-get update && apt-get install -y python3 curl gdal-bin python3-gdal

RUN apt-get update \
    && apt-get upgrade -y \
    && curl -sL https://deb.nodesource.com/setup_8.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g react-tools

# install dependencies
RUN cp /usr/bin/python3 /usr/bin/python

# install dependencies
RUN R -e "install.packages('dplyr',dependencies=TRUE, repos='http://cran.rstudio.com/')"\
    && R -e "install.packages('rdwd',dependencies=TRUE, repos='http://cran.rstudio.com/')"\
    && R -e "install.packages('raster',dependencies=TRUE, repos='http://cran.rstudio.com/')"\
    && R -e "install.packages('rgdal',dependencies=TRUE, repos='http://cran.rstudio.com/')"

    RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y nodejs git

RUN npm install

# bundle app source
COPY . .

# expose port
EXPOSE 3000

# command to start app
CMD [ "npm", "start" ]
