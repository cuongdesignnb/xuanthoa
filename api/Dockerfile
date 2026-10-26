# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
RUN npx tsc -p tsconfig.json

# ---- runtime ----
FROM node:24-alpine
RUN apk add --no-cache ffmpeg tini
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    UPLOAD_DIR=/data \
    FFMPEG_PATH=/usr/bin/ffmpeg
COPY package.json package-lock.json ./
# sharp tải binary musl qua optionalDependencies (không cần install script)
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
RUN mkdir -p /data && chown -R node:node /data /app
USER node
EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed-if-empty.js && node dist/server.js"]
