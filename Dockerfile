# 使用多阶段构建优化镜像大小

# 阶段1: 依赖安装和构建
# 使用 DaoCloud 镜像源加速（如果无法访问，可以改为其他国内镜像源）
FROM docker.m.daocloud.io/node:18-alpine AS builder

WORKDIR /app

# 复制 yarn 文件
COPY package.json yarn.lock ./

# 设置 yarn 镜像源
RUN yarn config set registry https://registry.npmmirror.com && \
    yarn install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN yarn build

# 阶段2: 生产运行环境
# 使用 DaoCloud 镜像源加速（如果无法访问，可以改为其他国内镜像源）
FROM docker.m.daocloud.io/node:18-alpine AS runner

WORKDIR /app

# 设置环境变量为生产模式
ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 创建 public 目录（Next.js 需要，即使为空）
RUN mkdir -p ./public

# 复制必要的文件
# 复制 standalone 构建输出（包含所有必要的文件）
# standalone 输出会将 server.js 放在根目录
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# 暴露端口
EXPOSE 6066

ENV PORT=6066
ENV HOSTNAME="0.0.0.0"

# 启动应用
# standalone 模式下，server.js 在根目录
CMD ["node", "server.js"]
