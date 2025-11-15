# ==================================
# Stage 1: Build React Application
# ==================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
# Use --production=false to install devDependencies needed for build
RUN npm ci --production=false

# Copy source code
COPY . .

# Build application for production
# Creates optimized static files in /app/dist
# Note: Using vite build directly to skip TypeScript type checking
# Type checking should be done in CI/CD pipeline before Docker build
RUN npx vite build

# ==================================
# Stage 2: Serve with Nginx
# ==================================
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy environment configuration script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Use custom entrypoint to inject runtime environment variables
ENTRYPOINT ["/docker-entrypoint.sh"]

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
