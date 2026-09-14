FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

RUN mkdir -p /app/public
COPY server.js ./server.js
# pool-parser.js jest współdzielony: serwer robi require('./pool-parser'),
# więc musi leżeć obok server.js, a przeglądarka ładuje go z /public.
COPY pool-parser.js ./pool-parser.js
COPY index.html ./public/index.html
COPY app.js words.js patterns.js sentence-gen.js pool-parser.js stories.js dialogues.js errors.js journey.js styles.css sw.js manifest.webmanifest ./public/
COPY icon-192.png icon-512.png icon-maskable.png ./public/

USER node
EXPOSE 8080
CMD ["node", "server.js"]
