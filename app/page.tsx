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
        <li>
          POST /api/wechat/report/records - 获取企业微信汇报记录（请求体：{"{"}
          "template_id": "模板ID", "start_time": 开始时间戳, "end_time":
          结束时间戳{"}"}）
        </li>
        <li>
          POST /api/wechat/report/statistic - 获取企业微信汇报统计（请求体：
          {"{"}"template_id": "模板ID（必填）", "start_time": 开始时间戳,
          "end_time": 结束时间戳{"}"}）
        </li>
        <li>
          GET /api/wechat/auth/url -
          生成企业微信授权登录URL（查询参数：redirect_uri, agentid等）
        </li>
        <li>
          GET /api/wechat/auth/callback -
          处理企业微信授权回调，获取用户信息（查询参数：code）
        </li>
        <li>
          POST /api/wechat/auth/userinfo - 通过userid获取用户详细信息（请求体：
          {"{"}"userid": "用户ID"{"}"}）
        </li>
      </ul>
    </main>
  );
}
