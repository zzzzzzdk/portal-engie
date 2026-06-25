FROM 192.168.7.52:8083/public/node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

ENV http_proxy=http://192.168.16.5:7777
ENV https_proxy=http://192.168.16.5:7777

RUN npm install

COPY . .
RUN npm run build

ENV http_proxy=
ENV https_proxy=

FROM 192.168.7.52:8083/cbb/nginx:1.27.4-alpine

ENV TZ=Asia/Shanghai

RUN mkdir -p /code/portal-web

COPY manifest/config/nginx/nginx.conf /etc/nginx/nginx.conf
COPY manifest/config/nginx/conf.d /etc/nginx/conf.d

COPY --from=builder /app/dist /code/portal-web
RUN cp /code/portal-web/index.html /code/portal-web/index.html.template

COPY manifest/scripts/start-portal.sh /usr/local/bin/start-portal.sh
RUN chmod +x /usr/local/bin/start-portal.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/start-portal.sh"]
