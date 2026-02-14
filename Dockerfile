# ============================================
# 架构治理系统 - 多阶段 Docker 构建
# ============================================

# --- 阶段 1: 静态资源服务 (当前) ---
FROM nginx:1.25-alpine AS production

# 安装时区支持
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制静态资源
COPY mockup/ /usr/share/nginx/html/

# 健康检查 (Render 会用到)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
