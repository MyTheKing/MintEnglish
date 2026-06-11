# 多阶段构建: Node 阶段编译静态产物, Nginx 阶段只装产物 → 最终镜像很小
# 构建: docker build -t mint-english .
# 运行: docker run -d -p 8080:80 --name mint-english mint-english   → 访问 http://localhost:8080

# ---- 构建阶段 ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- 运行阶段 ----
FROM nginx:alpine
COPY deploy/nginx.docker.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
