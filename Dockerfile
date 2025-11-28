# Use the official Puppeteer image
FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root for installation
USER root

# Set the working directory
WORKDIR /app

# --- FIX IS HERE: Force Puppeteer to download Chrome to the app folder ---
ENV PUPPETEER_CACHE_DIR=/app/.cache

# Copy package files
COPY package*.json ./

# Install dependencies (Chrome will now land in /app/.cache)
RUN npm install

# Copy the rest of your app files
COPY . .

# Grant permission to 'pptruser' for the app AND the new cache location
RUN chown -R pptruser:pptruser /app

# Switch back to the safe user
USER pptruser

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
