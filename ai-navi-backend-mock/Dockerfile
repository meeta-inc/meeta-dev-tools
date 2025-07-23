# Use official Node.js runtime as base image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Development stage
FROM base AS dev
ENV NODE_ENV=development
RUN npm ci
COPY . .
RUN chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3001
CMD ["dumb-init", "npm", "run", "dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM base AS production
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV PORT=3001
ENV HOST=0.0.0.0

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/ai-navi/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["dumb-init", "node", "dist/index.js"]