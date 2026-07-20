FROM node:20-slim AS base

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY ui/package.json ui/pnpm-lock.yaml ./ui/
RUN cd ui && pnpm install --frozen-lockfile

COPY . .

RUN cd ui && pnpm build

EXPOSE 5173

ENTRYPOINT ["node", "src/index.js"]
