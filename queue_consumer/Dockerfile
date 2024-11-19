FROM node:12-alpine
RUN apk add  --no-cache ffmpeg
WORKDIR /app
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install
COPY . .
# cd rabitQ node receive.js
CMD [ "node", "./rabitQ/receive.js" ]
