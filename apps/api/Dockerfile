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
RUN pnpm --filter @docflow/api build

# Stage 2: Prune devDependencies
RUN pnpm prune --prod

# Stage 3: Production runner
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/packages ./packages
COPY --from=build /usr/src/app/apps/api ./apps/api
COPY --from=build /usr/src/app/package.json ./package.json

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
