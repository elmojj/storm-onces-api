import { refreshOnesToken } from "./tokenService";
import { getAuthorizationHeader } from "./tokenStore";

const GRAPHQL_URL =
  "https://sz.ones.cn/project/api/project/team/ApkexV6i/items/graphql?t=group-task-data";

export async function postOnesGraphql(body: any, retryCount = 0) {
  let auth = getAuthorizationHeader();

  // 如果没有 auth，先尝试刷新一次
  if (!auth) {
    console.log("[onesGraphql] 没有 token，尝试刷新...");
    await refreshOnesToken();
    auth = getAuthorizationHeader();
  }

  if (!auth) {
    throw new Error("No Authorization available for GraphQL request");
  }

  const resp = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  // 如果是 401 错误且还没有重试过，尝试刷新 token 后重试
  if (resp.status === 401 && retryCount === 0) {
    console.log("[onesGraphql] 收到 401 错误，尝试刷新 token 后重试...");
    try {
      await refreshOnesToken();
      // 递归调用，但增加 retryCount 避免无限循环
      return postOnesGraphql(body, retryCount + 1);
    } catch (refreshError) {
      console.error("[onesGraphql] 刷新 token 失败", refreshError);
      const text = await resp.text();
      throw new Error(
        `GraphQL request failed: 401 (Unauthorized). Token refresh failed. Response: ${text}`
      );
    }
  }

  if (!resp.ok) {
    const text = await resp.text();
    console.error("[onesGraphql] 请求失败", resp.status, text);
    throw new Error(
      `GraphQL request failed: ${resp.status}. Response: ${text}`
    );
  }

  return resp.json();
}
