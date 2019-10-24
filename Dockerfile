FROM node:10

# create workdir
WORKDIR /usr/src/app

# copy package(-lock).json
COPY package*.json ./

# install dependecies
RUN npm install

# bundle app source
COPY . .

# expose port
EXPOSE 3000

# command to start app
CMD [ "npm", "start" ]

