import {
  getAuthorizationHeader,
  getRefreshToken,
  setTokens,
} from "./tokenStore";

const TOKEN_URL =
  process.env.ONES_TOKEN_URL || "https://ones.cn/identity/oauth/token";
const CLIENT_ID = process.env.ONES_CLIENT_ID || "ones.v1";
const COOKIE = process.env.ONES_COOKIE || "";

/**
 * 调用 ONES 的刷新 token 接口
 */
export async function refreshOnesToken(): Promise<void> {
  const currentAuth = getAuthorizationHeader();
  const currentRefreshToken = getRefreshToken();

  if (!currentAuth || !currentRefreshToken) {
    console.warn(
      "[tokenService] 缺少当前 access_token 或 refresh_token，无法刷新"
    );
    return;
  }

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", currentRefreshToken);
  body.set("client_id", CLIENT_ID);

  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh",
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    Authorization: currentAuth,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  };

  if (COOKIE) {
    headers["Cookie"] = COOKIE;
  }

  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers,
    body,
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("[tokenService] 刷新 token 失败", {
      status: resp.status,
      statusText: resp.statusText,
      response: text,
      hasRefreshToken: !!currentRefreshToken,
      hasAuth: !!currentAuth,
    });
    throw new Error(`Refresh token failed: ${resp.status}. Response: ${text}`);
  }

  const data: any = await resp.json();

  // 根据常见 OAuth2 返回：access_token / refresh_token / expires_in
  if (!data.access_token) {
    console.error("[tokenService] 响应中没有 access_token", data);
    throw new Error("No access_token in response");
  }

  setTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  });

  console.log("[tokenService] 刷新 token 成功");
}
