# Stage 1: Builder
# node:18-alpine v18.17.1
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Add build dependencies
RUN apk add --no-cache python3 make g++

# Set build arguments
ARG API_URL
ENV VITE_API_URL=${API_URL}
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./

# Install dependencies with cache mounting for better build performance
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Type check and build
RUN npm run typecheck && \
    npm run build

# Stage 2: Production
# nginx:1.23-alpine v1.23.4
FROM nginx:1.23-alpine

# Install security updates
RUN apk upgrade --no-cache

# Create nginx user and group with limited privileges
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Security headers configuration
RUN printf "add_header X-Content-Type-Options nosniff;\n\
add_header X-Frame-Options DENY;\n\
add_header X-XSS-Protection \"1; mode=block\";\n\
add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\";\n\
add_header Content-Security-Policy \"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ${API_URL}\";\n" > /etc/nginx/security-headers.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Set correct permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Configure gzip compression
RUN printf "gzip on;\n\
gzip_vary on;\n\
gzip_min_length 10240;\n\
gzip_proxied expired no-cache no-store private auth;\n\
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;\n\
gzip_disable \"MSIE [1-6]\\.\";\n" > /etc/nginx/conf.d/gzip.conf

# Set up browser caching
RUN printf "location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc)$ {\n\
    expires 1y;\n\
    access_log off;\n\
    add_header Cache-Control \"public\";\n\
}\n" > /etc/nginx/conf.d/cache-control.conf

# Add health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Add metadata labels
LABEL maintainer="SaaS Metrics Platform Team" \
    version="1.0.0" \
    description="SaaS Metrics Platform Frontend" \
    org.opencontainers.image.source="https://github.com/saas-metrics-platform" \
    org.opencontainers.image.vendor="SaaS Metrics Platform" \
    org.opencontainers.image.title="Frontend Application" \
    org.opencontainers.image.description="Production-ready frontend container for SaaS Metrics Platform" \
    org.opencontainers.image.version="1.0.0"

# Start nginx
CMD ["nginx", "-g", "daemon off;"]