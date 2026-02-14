FROM node:25-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/app/data/governance.db
ENV STATIC_DIR=/app/mockup
ENV SEED_FILE=/app/mockup/data.seed.js

RUN mkdir -p /app/data

COPY server ./server
COPY mockup ./mockup

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["node", "server/index.mjs"]
