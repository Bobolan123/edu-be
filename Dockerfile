# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (using npm install to be more lenient with lockfile)
RUN npm install

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs

# Copy built application and dependencies with ownership set immediately
# This prevents the "chown -R" command from taking 5+ minutes
COPY --chown=nestjs:nestjs --from=builder /app/dist ./dist
COPY --chown=nestjs:nestjs --from=builder /app/node_modules ./node_modules
COPY --chown=nestjs:nestjs --from=builder /app/package.json ./package.json

# Note: We removed copying the 'public' folder because it does not exist in your source

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main.js"]