FROM node:22-alpine
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@11.0.9

# Copy monorepo workspace config + lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy only what api needs from workspace packages
COPY packages/ ./packages/

# Copy api source
COPY apps/api/ ./apps/api/

# Install all workspace dependencies
RUN pnpm install --filter @abyte/api... --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @abyte/api prisma:generate

# Build NestJS app
RUN pnpm --filter @abyte/api build

EXPOSE 3001

CMD ["node", "apps/api/dist/main"]
