# Use the official Puppeteer image
FROM ghcr.io/puppeteer/puppeteer:latest

# --- NEW: Switch to root to install packages ---
USER root

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (now we have permission)
RUN npm install

# Copy the rest of your app files
COPY . .

# --- NEW: Give the 'pptruser' permission to run the app ---
# This fixes permissions for the folder so the app can read its own files
RUN chown -R pptruser:pptruser /app

# --- NEW: Switch back to the restricted user for security ---
USER pptruser

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
