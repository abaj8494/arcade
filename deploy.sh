#!/bin/bash

echo "Starting deployment of arcade.abaj.ai..."

# Build frontend 
echo "Building frontend..."
cd /var/www/arcade/frontend && npm run build

# Copy frontend build to public directory
echo "Copying frontend build to public directory..."
cd /var/www/arcade && rm -rf public/* && cp -r frontend/build/* public/

# Restart PM2 process
echo "Restarting PM2 process..."
pm2 restart arcade-backend

# Reload OpenResty to apply any configuration changes
echo "Reloading OpenResty..."
sudo systemctl reload openresty

echo "Deployment completed successfully!"
