export default function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>ONES API 系统</h1>
      <p>已提供以下 API：</p>
      <ul>
        <li>GET /api/auth/token - 获取当前 Authorization</li>
        <li>POST /api/auth/token - 手动刷新 token</li>
        <li>GET /api/tasks - 获取所有任务（使用默认查询）</li>
        <li>POST /api/tasks - 封装 ONES GraphQL 任务查询</li>
        <li>
          GET /api/tasks/by-user?userName=用户名&productId=产品ID -
          按用户名（必填）和产品 ID（可选）过滤并按 sprint 分类汇总任务
        </li>
        <li>
          POST /api/tasks/create - 创建新任务（请求体：{"{"}"title": "任务标题",
          "description": "任务描述（可选）", "userId": "用户ID"{"}"}）
        </li>
        <li>
          POST /api/tasks/update-manhour - 更新任务工时（请求体：{"{"}"taskId":
          "任务ID", "usedTime": 工时小时数{"}"}）
        </li>
      </ul>
    </main>
  );
}
