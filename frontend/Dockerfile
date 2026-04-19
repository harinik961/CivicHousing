# Stage 1: build the React app
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
# Browser calls the host-mapped API port (see docker-compose); default 5000 matches backend container.
ARG REACT_APP_API_BASE=http://localhost:5000
ENV REACT_APP_API_BASE=$REACT_APP_API_BASE
RUN npm run build

# Stage 2: serve static files with nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
