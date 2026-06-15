# Stage 1: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci && npm cache clean --force

COPY . .

# Generate Prisma client and build the app
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force
# Remove CLI packages since we don't need them in production
RUN npm remove @shopify/cli || true

# Copy built app and prisma files from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "run", "docker-start"]
