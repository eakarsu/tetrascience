FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S tetrascience && adduser -S tetrascience -G tetrascience
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
COPY migrations ./migrations
COPY scripts ./scripts
USER tetrascience
EXPOSE 4000
CMD ["node","dist/index.js"]
