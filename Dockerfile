FROM node:20
RUN npm i -g pnpm
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build
RUN pnpm run build
ENV PORT=10000
EXPOSE 10000
CMD node artifacts/api-server/dist/index.mjs
