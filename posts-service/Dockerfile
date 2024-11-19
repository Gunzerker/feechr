FROM node:12.2.0-alpine
WORKDIR /app
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install
RUN apk update
RUN apk add
RUN apk add ffmpeg
COPY . .
CMD [ "node", "index.js" ]
