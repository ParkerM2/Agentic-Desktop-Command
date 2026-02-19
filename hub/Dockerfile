# ADC Hub — Docker image
# Build: docker build -t parkerm2/adc-hub:latest .
# Run:   docker run -d -p 3200:3200 --name adc-hub parkerm2/adc-hub:latest

# Stage 1: Build TypeScript
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/ ./dist/
# DB migrations + schema resolve via __dirname from dist/db/
COPY src/db/migrations/ ./dist/db/migrations/
COPY src/db/schema.sql ./dist/db/schema.sql
RUN mkdir -p /app/data

ENV PORT=3200
ENV HOST=0.0.0.0
EXPOSE 3200

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3200/api/health || exit 1

CMD ["node", "dist/index.js"]
