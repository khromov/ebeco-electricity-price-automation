FROM node:18-alpine AS ebeco-build

WORKDIR /usr/src/app
COPY . /usr/src/app

RUN npm install
RUN npm run build

FROM node:18-alpine

ARG TZ=Europe/Stockholm

RUN apk add --update-cache curl tzdata ncdu && rm -rf /var/cache/apk/*
RUN cp /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /usr/src/app
COPY --from=ebeco-build /usr/src/app/build /usr/src/app/build
COPY --from=ebeco-build /usr/src/app/package.json /usr/src/app/package.json

CMD [ "npm", "run", "start" ]