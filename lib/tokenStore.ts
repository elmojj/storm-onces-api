let accessToken = process.env.ONES_INITIAL_ACCESS_TOKEN || "";
let refreshToken = process.env.ONES_INITIAL_REFRESH_TOKEN || "";
let expiresAt: number | null = null; // Unix 时间戳（秒）

export type TokenInfo = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
};

export function getTokenInfo(): TokenInfo {
  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
}

export function getAuthorizationHeader(): string | null {
  console.log("🚀 ~ accessToken:", accessToken);
  if (!accessToken) return null;
  return `Bearer ${accessToken}`;
}

export function setTokens(params: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number; // 秒
}) {
  accessToken = params.accessToken;
  if (params.refreshToken) {
    refreshToken = params.refreshToken;
  }
  if (typeof params.expiresIn === "number") {
    expiresAt = Math.floor(Date.now() / 1000) + params.expiresIn;
  }
}

export function getRefreshToken(): string | null {
  return refreshToken || null;
}

/**
 * 判断是否接近过期（默认小于 5 分钟）
 */
export function isTokenNearExpiry(thresholdSeconds = 300): boolean {
  if (!expiresAt) return false;
  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now <= thresholdSeconds;
}
