# --- Stage 1: Dependency Builder ---
    FROM node:20-slim AS deps
    WORKDIR /usr/src/app
    
    # Install essential build tools just in case better-sqlite3 
    # still needs to compile from source
    RUN apt-get update && apt-get install -y \
        python3 \
        make \
        g++ \
        && rm -rf /var/lib/apt/lists/*
    
    # Use mounts to install dependencies without bloating the image
    RUN --mount=type=bind,source=package.json,target=package.json \
        --mount=type=bind,source=package-lock.json,target=package-lock.json \
        --mount=type=cache,target=/root/.npm \
        npm ci --omit=dev
    
    # --- Stage 2: Final Runner ---
    FROM node:20-slim AS runner
    WORKDIR /usr/src/app
    
    # Set production environment
    ENV NODE_ENV=production
    
    # Create a non-root user for better security
    RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
    USER nodejs
    
    # Copy only the built node_modules from the deps stage
    COPY --from=deps /usr/src/app/node_modules ./node_modules
    # Copy the rest of your application code
    COPY . .
    
    # Expose your app's port
    EXPOSE 3000
    
    CMD ["node", "index.js"]