FROM node:10

# create workdir
WORKDIR /usr/src/app

# copy package(-lock).json
COPY package*.json ./

# install dependencies
RUN apt-get update && apt-get remove -y python && apt-get install -y python3 gdal-bin python-gdal python3-gdal libgdal-dev libgdal20

# install current R
RUN apt-get install -y software-properties-common
RUN echo "disable-ipv6" >> ~/.gnupg/dirmngr.conf

# one the both following lines work, shouldn't throw an error that one of them doesn't
RUN apt-key adv --keyserver keys.gnupg.net --recv-key 'E19F5F87128899B192B1A2C2AD5F960A256A04AF'
RUN gpg --keyserver keys.gnupg.net --recv-key 'E19F5F87128899B192B1A2C2AD5F960A256A04AF'

RUN add-apt-repository 'deb http://cloud.r-project.org/bin/linux/debian stretch-cran35/'
RUN apt update
RUN apt-get install -y r-base

# install dependencies
RUN cp /usr/bin/python3 /usr/bin/python

# install dependencies
RUN R -e "install.packages('dplyr',dependencies=TRUE, repos='http://cran.rstudio.com/')"\
    && R -e "install.packages('rdwd',dependencies=TRUE, repos='http://cran.rstudio.com/')"\
    && R -e "install.packages('dwdradar',dependencies=TRUE, repos='http://cran.rstudio.com/')"\
    && R -e "install.packages('sp',dependencies=TRUE, repos='http://cran.rstudio.com/')"\
    && R -e "install.packages('raster',dependencies=TRUE, repos='http://cran.rstudio.com/')"\
    && R -e "install.packages('rgdal',dependencies=TRUE, repos='http://cran.rstudio.com/')"\
    && R -e "install.packages('RCurl',dependencies=TRUE, repos='http://cran.rstudio.com/')"

# install dependencies
RUN npm install

# bundle app source
COPY . .

# expose port
EXPOSE 3000

# command to start app
CMD [ "npm", "start" ]
