# ONES API 代理系统

这是一个基于 Next.js 的 API 系统，提供 ONES token 自动刷新和 GraphQL 请求代理功能。

## 功能特性

1. **Token 自动刷新**：每小时自动刷新一次 ONES access token
2. **获取 Authorization**：提供 API 端点获取最新的 Authorization header
3. **GraphQL 代理**：封装 ONES GraphQL 接口，自动添加 Authorization header
4. **任务管理**：提供创建任务、更新工时等任务管理接口
5. **自动重试**：接口在遇到 401 错误时会自动刷新 token 并重试
6. **企业微信集成**：封装企业微信汇报应用接口，自动管理 access_token
7. **企业微信授权登录**：提供完整的OAuth授权登录流程，支持获取用户信息

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

**ONES 相关：**

- `ONES_INITIAL_ACCESS_TOKEN`：从浏览器抓取的 access token（Bearer 后面的部分）
- `ONES_INITIAL_REFRESH_TOKEN`：从浏览器抓取的 refresh token
- `ONES_COOKIE`（可选）：如果需要 Cookie 才能刷新 token

**企业微信相关：**

- `WECHAT_CORPID`：企业微信的企业ID
- `WECHAT_SECRET`：企业微信应用的Secret（用于获取access_token）
- `WECHAT_AGENTID`：企业微信应用的AgentID（用于OAuth授权）

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

### 4. 创建新任务

**POST** `/api/tasks/create`

创建新的 ONES 任务。

**请求体：**

```json
{
  "title": "任务标题",
  "description": "任务描述（可选）",
  "userId": "Ai5bfAgB"
}
```

**参数说明：**

- `title`（必填）：任务标题，字符串类型
- `description`（可选）：任务描述，字符串类型
- `userId`（必填）：用户ID，字符串类型

**响应格式：**

```json
{
  "success": true,
  "data": {
    // ONES API 返回的原始数据
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "error": "错误信息",
  "details": {
    "status": 400,
    "title": "任务标题",
    "userId": "Ai5bfAgB",
    "url": "https://sz.ones.cn/project/api/project/team/ApkexV6i/tasks/add3"
  }
}
```

**使用示例：**

```bash
curl -X POST http://localhost:3000/api/tasks/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "test1",
    "description": "description test 1",
    "userId": "Ai5bfAgB"
  }'
```

**注意事项：**

- `project_uuid` 和 `issue_type_uuid` 会自动生成，无需手动传入
- 接口会自动处理 token 刷新（401 错误时）

### 5. 更新任务工时

**POST** `/api/tasks/update-manhour`

更新指定任务的工时。

**请求体：**

```json
{
  "taskId": "Ai5bfAgBEmOllWPC",
  "usedTime": 2
}
```

**参数说明：**

- `taskId`（必填）：任务ID，可以使用任务的 key 或 uuid
- `usedTime`（必填）：工时（小时），数字类型，会自动转换为 `value = usedTime * 100000`

**响应格式：**

```json
{
  "success": true,
  "data": {
    // ONES API 返回的原始数据
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "error": "错误信息",
  "details": {
    "status": 404,
    "taskId": "Ai5bfAgBEmOllWPC",
    "url": "https://sz.ones.cn/project/api/project/team/ApkexV6i/task/..."
  }
}
```

**使用示例：**

```bash
curl -X POST http://localhost:3000/api/tasks/update-manhour \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "Ai5bfAgBEmOllWPC",
    "usedTime": 2
  }'
```

**注意事项：**

- 如果任务不存在或无权访问，会返回 404 错误
- 接口会自动处理 token 刷新（401 错误时）

### 6. 企业微信汇报 - 获取汇报记录

**POST** `/api/wechat/report/records`

获取企业微信汇报记录，支持按时间范围、用户等条件筛选。

**请求体：**

```json
{
  "template_id": "汇报模板ID（可选）",
  "start_time": 1640995200,
  "end_time": 1641081600,
  "userid": "用户ID（可选）",
  "cursor": "分页游标（可选）",
  "limit": 100,
  "corpid": "企业ID（可选，优先使用环境变量）",
  "secret": "应用Secret（可选，优先使用环境变量）"
}
```

**参数说明：**

- `template_id`（可选）：汇报模板ID
- `start_time`（可选）：开始时间戳（Unix 时间戳）
- `end_time`（可选）：结束时间戳（Unix 时间戳）
- `userid`（可选）：用户ID，筛选特定用户的汇报
- `cursor`（可选）：分页游标，用于获取下一页数据
- `limit`（可选）：每页数量，默认100，最大100
- `corpid`（可选）：企业ID，未提供时使用环境变量 `WECHAT_CORPID`
- `secret`（可选）：应用Secret，未提供时使用环境变量 `WECHAT_SECRET`

**响应格式：**

```json
{
  "success": true,
  "data": {
    "records": [
      // 汇报记录列表
    ],
    "next_cursor": "下一页游标"
  }
}
```

**使用示例：**

```bash
curl -X POST http://localhost:3000/api/wechat/report/records \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "模板ID",
    "start_time": 1640995200,
    "end_time": 1641081600,
    "limit": 50
  }'
```

**注意事项：**

- 需要先在企业微信管理后台启用「汇报」应用
- 需要配置环境变量 `WECHAT_CORPID` 和 `WECHAT_SECRET`，或在请求体中提供
- access_token 会自动缓存，有效期2小时

### 7. 企业微信汇报 - 获取汇报统计

**POST** `/api/wechat/report/statistic`

获取企业微信汇报的统计信息，包括未读、已提交数量等。

**请求体：**

```json
{
  "template_id": "汇报模板ID（必填）",
  "start_time": 1640995200,
  "end_time": 1641081600,
  "corpid": "企业ID（可选，优先使用环境变量）",
  "secret": "应用Secret（可选，优先使用环境变量）"
}
```

**参数说明：**

- `template_id`（必填）：汇报模板ID
- `start_time`（可选）：开始时间戳（Unix 时间戳）
- `end_time`（可选）：结束时间戳（Unix 时间戳）
- `corpid`（可选）：企业ID，未提供时使用环境变量 `WECHAT_CORPID`
- `secret`（可选）：应用Secret，未提供时使用环境变量 `WECHAT_SECRET`

**响应格式：**

```json
{
  "success": true,
  "data": {
    "statistics": [
      // 统计信息列表，包含未读、已提交数量等
    ]
  }
}
```

**使用示例：**

```bash
curl -X POST http://localhost:3000/api/wechat/report/statistic \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "模板ID",
    "start_time": 1640995200,
    "end_time": 1641081600
  }'
```

**注意事项：**

- 需要先在企业微信管理后台启用「汇报」应用
- 需要配置环境变量 `WECHAT_CORPID` 和 `WECHAT_SECRET`，或在请求体中提供
- access_token 会自动缓存，有效期2小时

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

### 使用 curl 创建新任务

```bash
curl -X POST http://localhost:3000/api/tasks/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新任务",
    "description": "任务描述",
    "userId": "Ai5bfAgB"
  }'
```

### 使用 curl 更新任务工时

```bash
curl -X POST http://localhost:3000/api/tasks/update-manhour \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "Ai5bfAgBEmOllWPC",
    "usedTime": 2
  }'
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

// 创建新任务
const createRes = await fetch('http://localhost:3000/api/tasks/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '新任务',
    description: '任务描述',
    userId: 'Ai5bfAgB'
  })
});
const createResult = await createRes.json();

// 更新任务工时
const updateRes = await fetch('http://localhost:3000/api/tasks/update-manhour', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskId: 'Ai5bfAgBEmOllWPC',
    usedTime: 2
  })
});
const updateResult = await updateRes.json();

// 获取企业微信汇报记录
const reportRes = await fetch('http://localhost:3000/api/wechat/report/records', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template_id: '模板ID',
    start_time: 1640995200,
    end_time: 1641081600
  })
});
const reportData = await reportRes.json();

// 获取企业微信汇报统计
const statisticRes = await fetch('http://localhost:3000/api/wechat/report/statistic', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template_id: '模板ID',
    start_time: 1640995200,
    end_time: 1641081600
  })
});
const statisticData = await statisticRes.json();

// 生成企业微信授权URL
const authUrlRes = await fetch('http://localhost:3000/api/wechat/auth/url?redirect_uri=http://localhost:3000/callback&agentid=1000002');
const { url } = await authUrlRes.json();
// 引导用户跳转到 url

// 处理授权回调（在企业微信回调的页面中）
const callbackRes = await fetch('http://localhost:3000/api/wechat/auth/callback?code=xxx&include_detail=true');
const callbackData = await callbackRes.json();

// 获取用户详细信息
const userInfoRes = await fetch('http://localhost:3000/api/wechat/auth/userinfo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userid: '用户ID'
  })
});
const userInfo = await userInfoRes.json();
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
