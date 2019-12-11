FROM node:10

# create workdir
WORKDIR /usr/src/app

# copy package(-lock).json
COPY package*.json ./

# install dependencies
RUN apt-get update && apt-get remove -y python && apt-get install -y python3 gdal-bin python-gdal python3-gdal r-base

# install dependencies
RUN cp /usr/bin/python3 /usr/bin/python

# install dependencies
RUN R -e "install.packages('dplyr',dependencies=TRUE, repos='http://cran.rstudio.com/')"\
    && R -e "install.packages('rdwd',dependencies=TRUE, repos='http://cran.rstudio.com/')"\
    && R -e "install.packages('raster',dependencies=TRUE, repos='http://cran.rstudio.com/')"\
    && R -e "install.packages('rgdal',dependencies=TRUE, repos='http://cran.rstudio.com/')"\

# install dependencies
RUN npm install

# bundle app source
COPY . .

# expose port
EXPOSE 3000

# command to start app
CMD [ "npm", "start" ]
