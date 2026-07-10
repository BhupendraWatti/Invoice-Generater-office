# Base node image
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /usr/src/app

# Stage 1: Build dependency graph and compile everything
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @docflow/shared-types build
RUN pnpm --filter @docflow/db build
RUN pnpm --filter @docflow/web build

# Stage 2: Production runner
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/packages ./packages
COPY --from=build /usr/src/app/apps/web ./apps/web
COPY --from=build /usr/src/app/package.json ./package.json

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/web/node_modules/.bin/next", "start"]
