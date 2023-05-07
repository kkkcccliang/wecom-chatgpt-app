FROM node:19-alpine AS app

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
CMD npm run start:dev