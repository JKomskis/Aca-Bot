FROM node:lts

# Use non-root user
USER node

# Create app directory
RUN mkdir /home/node/app
WORKDIR /home/node/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

#ADD repositories /etc/apk/repositories
#RUN apk add --update python python-dev py-pip build-base

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY --chown=node:node . .

# Compile project
RUN npm run gulp

CMD [ "npm", "start" ]