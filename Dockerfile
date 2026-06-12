# Evercog MVP Dockerfile
# 多阶段构建优化镜像大小

# Stage 1: 安装依赖
FROM node:20-alpine AS deps
WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci --only=production

# Stage 2: 构建应用
FROM node:20-alpine AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建 Next.js
RUN npm run build

# Stage 3: 生产镜像
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
