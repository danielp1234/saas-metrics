# Stage 1: Builder
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build essentials and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies with exact versions
RUN npm ci --ignore-scripts

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Run security audit
RUN npm audit

# Prune dev dependencies
RUN npm prune --production

# Clean npm cache
RUN npm cache clean --force

# Stage 2: Production
FROM node:18-alpine

# Add labels
LABEL maintainer="SaaS Metrics Platform Team" \
      version="1.0" \
      description="SaaS Metrics Backend Service" \
      environment="production"

# Set working directory
WORKDIR /app

# Install security updates and required packages
RUN apk update && \
    apk add --no-cache \
    wget \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create non-root user and group
RUN addgroup -S nodejs && \
    adduser -S nodejs -G nodejs

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS='--max-old-space-size=2048' \
    TZ=UTC

# Copy built files from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Create necessary directories with appropriate permissions
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app/logs

# Set up health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Enable read-only root filesystem
RUN chmod -R 555 /app && \
    chmod -R 755 /app/logs

# Expose application port
EXPOSE 3000

# Switch to non-root user
USER nodejs

# Start production server
CMD ["node", "dist/server.js"]