FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

RUN mkdir -p /app/public
COPY server.js ./server.js
COPY index.html ./public/index.html
COPY app.js words.js patterns.js stories.js dialogues.js errors.js journey.js styles.css sw.js manifest.webmanifest ./public/
COPY icon-192.png icon-512.png icon-maskable.png ./public/

USER node
EXPOSE 8080
CMD ["node", "server.js"]
