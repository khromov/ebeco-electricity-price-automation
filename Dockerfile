FROM node:18-alpine
ADD . .
RUN npm install
CMD [ "npm", "run", "start" ]