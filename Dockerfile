FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Zależności
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
# Pliki serwera (korzeń) — serwer wymaga ich przez require
COPY server.js pool-parser.js ./
COPY learning-events.js mastery-engine.js review-engine.js learner-model.js task-engine.js adaptation-engine.js ./
# Pliki przeglądarki (public) — serwer serwuje je jako statyki
COPY public ./public
USER node
EXPOSE 8080
CMD ["node","server.js"]
