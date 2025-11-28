# Use the official Puppeteer image which includes Chrome and all dependencies
FROM ghcr.io/puppeteer/puppeteer:latest

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of your app files
COPY . .

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]