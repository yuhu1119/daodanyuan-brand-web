FROM node:20-alpine

WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN node scripts/seed-data.mjs 2>/dev/null || true \
  && npm run build \
  && chown -R app:app /app

ENV NODE_ENV=production
ENV ADMIN_PORT=3000

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "admin/server.js"]
