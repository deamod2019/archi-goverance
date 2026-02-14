FROM node:25-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
ENV STATIC_DIR=/app/mockup
ENV SEED_FILE=/app/mockup/data.seed.js
ENV SEED_FORCE=false

COPY package.json ./
RUN npm install --omit=dev

COPY server ./server
COPY mockup ./mockup

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["npm", "start"]
