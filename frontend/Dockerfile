# Build stage
FROM node:20-alpine as builder
WORKDIR /app
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["/bin/sh", "-c", "printf 'window.__SAWS_CONFIG__ = { API_BASE_URL: \"%s\" };\\n' \"$API_BASE_URL\" > /usr/share/nginx/html/env.js && nginx -g 'daemon off;'"]
