#!/bin/sh
# Docker entrypoint script for React frontend
# Injects runtime environment variables into built JavaScript files

set -e

# Environment variables that can be set at runtime
ENV_VARS="VITE_API_BASE_URL"

# Default values if not provided
: ${VITE_API_BASE_URL:=http://localhost:8000}

echo "🔧 Injecting runtime environment variables..."

# Find the main JS file (Vite builds to assets/index-*.js)
MAIN_JS_FILE=$(find /usr/share/nginx/html/assets -name 'index-*.js' -type f | head -n 1)

if [ -n "$MAIN_JS_FILE" ]; then
    echo "📦 Found main JS file: $MAIN_JS_FILE"

    # Create a backup
    cp "$MAIN_JS_FILE" "$MAIN_JS_FILE.bak"

    # Replace environment variables in the JS file
    # This replaces placeholder values set during build with runtime values
    for var in $ENV_VARS; do
        # Get the value of the environment variable
        value=$(eval echo \$$var)
        echo "   Setting $var=$value"

        # Replace in the JS file
        # This assumes the build contains: import.meta.env.VITE_API_BASE_URL
        # We replace the default value with the runtime value
        sed -i "s|http://localhost:8000|$value|g" "$MAIN_JS_FILE"
    done

    echo "✅ Environment variables injected successfully"
else
    echo "⚠️  Warning: Could not find main JS file. Using build-time environment variables."
fi

# Execute the CMD from Dockerfile
exec "$@"
