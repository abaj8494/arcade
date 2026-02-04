#!/bin/bash

echo "Starting deployment of arcade.abaj.ai..."

# Build frontend 
echo "Building frontend..."
cd /var/www/arcade/frontend && npm run build

# Copy frontend build to public directory (preserve images folder)
echo "Copying frontend build to public directory..."
cd /var/www/arcade
# Backup images folder
cp -r public/images /tmp/arcade-images-backup 2>/dev/null || true
rm -rf public/*
cp -r frontend/build/* public/
# Restore images folder
cp -r /tmp/arcade-images-backup/* public/images/ 2>/dev/null || true
rm -rf /tmp/arcade-images-backup

# Restart PM2 process
echo "Restarting PM2 process..."
pm2 restart arcade-backend

# Reload OpenResty to apply any configuration changes
echo "Reloading OpenResty..."
sudo systemctl reload openresty

echo "Deployment completed successfully!"
