FROM node:20-slim AS build
WORKDIR /app
ARG VITE_API_URL=/api
ARG VITE_MSG91_WIDGET_ID=
ARG VITE_MSG91_TOKEN_AUTH=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MSG91_WIDGET_ID=$VITE_MSG91_WIDGET_ID
ENV VITE_MSG91_TOKEN_AUTH=$VITE_MSG91_TOKEN_AUTH
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
