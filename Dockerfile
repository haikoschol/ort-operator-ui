FROM docker.io/nginx:stable

COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY ./deploy/run.sh /run.sh
COPY src/* /usr/share/nginx/html

EXPOSE 8080
CMD ["/run.sh"]
