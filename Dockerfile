# Business OS – single container: Vite frontend (dist) + Node/Express server.
FROM node:22-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json tailwind.config.js postcss.config.js ./
COPY src ./src
ARG VITE_EDITION=
ENV VITE_EDITION=$VITE_EDITION
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/src ./server/src
COPY server/tsconfig.json ./server/
# server reuses shared modules from the frontend source (src/lib)
COPY src ./src
COPY tsconfig.json ./
COPY --from=web /app/dist ./dist
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 DATA_DIR=/data
RUN mkdir -p /data
EXPOSE 8080
WORKDIR /app/server
CMD ["npx", "tsx", "src/index.ts"]
