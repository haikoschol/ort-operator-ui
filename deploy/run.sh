#!/bin/bash
envsubst < /usr/share/nginx/html/configTemplate.js > /usr/share/nginx/html/config.js
nginx -g 'daemon off;'