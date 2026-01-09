# ONES API 代理系统

这是一个基于 Next.js 的 API 系统，提供 ONES token 自动刷新和 GraphQL 请求代理功能。

## 功能特性

1. **Token 自动刷新**：每小时自动刷新一次 ONES access token
2. **获取 Authorization**：提供 API 端点获取最新的 Authorization header
3. **GraphQL 代理**：封装 ONES GraphQL 接口，自动添加 Authorization header

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local`，并填入你的初始 token：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，填入：
- `ONES_INITIAL_ACCESS_TOKEN`：从浏览器抓取的 access token（Bearer 后面的部分）
- `ONES_INITIAL_REFRESH_TOKEN`：从浏览器抓取的 refresh token
- `ONES_COOKIE`（可选）：如果需要 Cookie 才能刷新 token

### 3. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## API 端点

### 1. 获取 Authorization Token

**GET** `/api/auth/token`

返回当前可用的 Authorization header。

**响应示例：**
```json
{
  "authorization": "Bearer eyJhbGci...",
  "accessToken": "eyJhbGci...",
  "refreshToken": "0252f00f-0b87-48cd-5226-6989d572189e",
  "expiresAt": 1767163500
}
```

**POST** `/api/auth/token`

手动触发 token 刷新，返回新的 token 信息。

### 2. 获取所有任务（GraphQL 代理）

**GET** `/api/tasks`

使用 GET 方法获取任务，支持以下方式：

1. **无参数**：使用默认查询获取所有任务（默认项目 ID: `9JXgFFByHdimtBXW`）
   ```bash
   curl http://localhost:3000/api/tasks
   ```

2. **指定项目 ID**：通过 `projectId` 参数指定项目
   ```bash
   curl "http://localhost:3000/api/tasks?projectId=9JXgFFByHdimtBXW"
   ```

3. **带查询参数**：通过 URL 参数自定义查询
   ```bash
   # 只自定义 variables
   curl "http://localhost:3000/api/tasks?variables=%7B%22filterGroup%22%3A%5B%7B%22project_in%22%3A%5B%229JXgFFByHdimtBXW%22%5D%7D%5D%7D"
   
   # 自定义 query 和 variables（需要 URL 编码）
   curl "http://localhost:3000/api/tasks?query=...&variables=..."
   
   # 同时指定 projectId（会覆盖 variables 中的 project_in）
   curl "http://localhost:3000/api/tasks?projectId=9JXgFFByHdimtBXW&variables=..."
   ```

**POST** `/api/tasks`

使用 POST 方法，通过请求体传递 GraphQL 查询。

**请求体示例：**
```json
{
  "query": "{ buckets (...) { ... } }",
  "variables": {
    "groupBy": { "tasks": {} },
    "groupOrderBy": null,
    "orderBy": { "position": "ASC", "createTime": "DESC" },
    "filterGroup": [{ "project_in": ["9JXgFFByHdimtBXW"] }],
    "search": null,
    "pagination": { "limit": 1000, "preciseCount": false }
  }
}
```

**或者使用 projectId 参数（会自动更新 filterGroup）：**
```json
{
  "query": "{ buckets (...) { ... } }",
  "projectId": "9JXgFFByHdimtBXW"
}
```

**响应：** 直接返回 ONES GraphQL 接口的响应。

### 3. 按用户名汇总任务（按 Sprint 分类）

**GET** `/api/tasks/by-user?userName=用户名`

根据用户名过滤任务，并按 sprint 名称分类汇总。

**查询参数：**
- `userName`（必填）：要查询的用户名

**响应格式：**
```json
{
  "2025-12-22": [
    {
      "key": "task-WsoCfdNrfy4b2GAo",
      "path": "WsoCfdNrfy4b2GAo",
      "projectUuid": "9JXgFFByHdimtBXW",
      "name": "【Waterdesk-Pro】模型上传检查中加入非法字符检查",
      "number": 20625,
      "status": {
        "uuid": "FMx2vHjb",
        "name": "已完成",
        "category": "done"
      },
      "usedTime": 0
    }
  ],
  "2026-01-04": [
    {
      "key": "task-E8gqGEkWdvqr2I9B",
      "path": "E8gqGEkWdvqr2I9B",
      "projectUuid": "9JXgFFByHdimtBXW",
      "name": "加密模型文件通过在线系统分享给其他人",
      "number": 20620,
      "status": {
        "uuid": "MpcwADR6",
        "name": "进行中",
        "category": "in_progress"
      },
      "usedTime": 0
    }
  ],
  "未分配": [
    {
      "key": "task-xxx",
      "path": "xxx",
      "projectUuid": "9JXgFFByHdimtBXW",
      "name": "任务名称",
      "number": 20749,
      "status": null,
      "usedTime": 0
    }
  ]
}
```

**使用示例：**
```bash
curl "http://localhost:3000/api/tasks/by-user?userName=龚金凯"
```

## 使用示例

### 使用 curl 获取 token

```bash
curl http://localhost:3000/api/auth/token
```

### 使用 curl 获取任务

**GET 方式（使用默认查询）：**
```bash
curl http://localhost:3000/api/tasks
```

**POST 方式（自定义查询）：**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ buckets (...) { ... } }",
    "variables": { ... }
  }'
```

### 使用 curl 按用户名汇总任务

```bash
curl "http://localhost:3000/api/tasks/by-user?userName=龚金凯"
```

### 在代码中使用

```typescript
// 获取 token
const tokenRes = await fetch('http://localhost:3000/api/auth/token');
const { authorization } = await tokenRes.json();

// 获取任务
const tasksRes = await fetch('http://localhost:3000/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: '...',
    variables: { ... }
  })
});
const tasks = await tasksRes.json();
```

## 自动刷新机制

- 系统启动后，定时任务会在第一次 API 请求时自动启动
- 每小时检查一次 token 是否接近过期（默认 5 分钟内）
- 如果接近过期，自动调用刷新接口更新 token
- Token 存储在内存中，服务重启后需要重新配置初始 token

## 注意事项

1. 初始 token 需要从浏览器开发者工具中抓取
2. Token 存储在内存中，服务重启后会丢失，需要重新配置
3. 如果部署到 Serverless 环境（如 Vercel），建议使用外部定时任务触发刷新

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- Node.js

