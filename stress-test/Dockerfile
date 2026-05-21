FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY stress-test.js ./

ENTRYPOINT ["node", "stress-test.js"]
