FROM node:18-alpine
ARG TZ=Europe/Stockholm

RUN apk update && apk upgrade && apk add curl tzdata
RUN cp /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

ADD . .
RUN npm install
CMD [ "npm", "run", "start" ]
