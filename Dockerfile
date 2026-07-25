# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package dependencies and lockfile
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the static files using Nginx
FROM nginx:alpine

# Copy the Nginx configuration for single-page apps (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from build stage to nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 8080 (Google Cloud Run default port)
ENV PORT=8080
EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
