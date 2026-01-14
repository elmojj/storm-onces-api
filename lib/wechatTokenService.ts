/**
 * 企业微信 Access Token 服务
 * 用于获取和管理企业微信的 access_token
 */

interface WechatTokenData {
  accessToken: string;
  expiresIn: number;
  expiresAt: number;
}

// 内存存储 token（生产环境建议使用 Redis 等持久化存储）
let wechatTokenCache: WechatTokenData | null = null;

const WECHAT_TOKEN_URL = "https://qyapi.weixin.qq.com/cgi-bin/gettoken";

/**
 * 获取企业微信 access_token
 * @param corpid 企业ID
 * @param secret 应用Secret
 * @returns access_token
 */
export async function getWechatAccessToken(
  corpid: string,
  secret: string
): Promise<string> {
  // 检查缓存中的 token 是否仍然有效（提前5分钟刷新）
  const now = Math.floor(Date.now() / 1000);
  if (
    wechatTokenCache &&
    wechatTokenCache.expiresAt > now + 300 &&
    wechatTokenCache.accessToken
  ) {
    return wechatTokenCache.accessToken;
  }

  // 从环境变量获取配置（如果参数未提供）
  const corpId = corpid || process.env.WECHAT_CORPID || "";
  const appSecret = secret || process.env.WECHAT_SECRET || "";

  if (!corpId || !appSecret) {
    throw new Error(
      "企业微信 corpid 和 secret 未配置，请设置环境变量 WECHAT_CORPID 和 WECHAT_SECRET，或通过参数传入"
    );
  }

  const url = `${WECHAT_TOKEN_URL}?corpid=${corpId}&corpsecret=${appSecret}`;

  console.log("[wechatTokenService] 获取 access_token...");

  const resp = await fetch(url, {
    method: "GET",
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("[wechatTokenService] 获取 token 失败", {
      status: resp.status,
      response: text,
    });
    throw new Error(
      `获取企业微信 access_token 失败: ${resp.status}. Response: ${text}`
    );
  }

  const data: any = await resp.json();

  if (data.errcode !== 0) {
    console.error("[wechatTokenService] 获取 token 返回错误", data);
    throw new Error(
      `获取企业微信 access_token 失败: ${data.errcode} - ${data.errmsg}`
    );
  }

  if (!data.access_token) {
    throw new Error("企业微信 API 响应中没有 access_token");
  }

  // 缓存 token
  const expiresIn = data.expires_in || 7200; // 默认2小时
  wechatTokenCache = {
    accessToken: data.access_token,
    expiresIn,
    expiresAt: now + expiresIn,
  };

  console.log("[wechatTokenService] 获取 access_token 成功");

  return data.access_token;
}

/**
 * 清除缓存的 token（用于强制刷新）
 */
export function clearWechatTokenCache(): void {
  wechatTokenCache = null;
}

/**
 * 获取当前缓存的 token（如果有效）
 */
export function getCachedWechatToken(): string | null {
  const now = Math.floor(Date.now() / 1000);
  if (
    wechatTokenCache &&
    wechatTokenCache.expiresAt > now &&
    wechatTokenCache.accessToken
  ) {
    return wechatTokenCache.accessToken;
  }
  return null;
}
