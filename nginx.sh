docker run -d --name nginx-file-server \
  -p 8080:80 \
  -v $(pwd):/usr/share/nginx/html:ro \
  -v $(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine

