FROM node:20
RUN npm i -g pnpm
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile --dangerously-allow-all-builds
RUN pnpm --filter @workspace/trustlink run build
RUN pnpm --filter @workspace/api-server run build
ENV PORT=10000
EXPOSE 10000
CMD node artifacts/api-server/dist/index.mjs
