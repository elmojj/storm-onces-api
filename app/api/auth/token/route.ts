import { startRefreshScheduler } from "@/lib/refreshScheduler";
import { refreshOnesToken } from "@/lib/tokenService";
import { getAuthorizationHeader, getTokenInfo } from "@/lib/tokenStore";
import { NextRequest, NextResponse } from "next/server";

// 标记为动态路由
export const dynamic = "force-dynamic";

// 确保定时任务在第一次请求时启动
startRefreshScheduler();

// GET /api/auth/token  用于获取当前 Authorization
export async function GET(_req: NextRequest) {
  try {
    const auth = getAuthorizationHeader();
    const info = getTokenInfo();

    // 检查环境变量配置
    const hasInitialToken = !!process.env.ONES_INITIAL_ACCESS_TOKEN;
    const hasRefreshToken = !!process.env.ONES_INITIAL_REFRESH_TOKEN;

    if (!auth) {
      return NextResponse.json(
        {
          error: "No access token available",
          debug: {
            hasInitialToken,
            hasRefreshToken,
            hasStoredToken: !!info.accessToken,
            hasStoredRefreshToken: !!info.refreshToken,
            expiresAt: info.expiresAt,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authorization: auth,
      accessToken: info.accessToken,
      refreshToken: info.refreshToken,
      expiresAt: info.expiresAt,
      debug: {
        hasInitialToken,
        hasRefreshToken,
        tokenLength: info.accessToken?.length || 0,
      },
    });
  } catch (err: any) {
    console.error("/api/auth/token error", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// 可选：提供一个手动触发刷新 POST /api/auth/token
export async function POST(_req: NextRequest) {
  try {
    await refreshOnesToken();
    const auth = getAuthorizationHeader();
    const info = getTokenInfo();
    return NextResponse.json({
      authorization: auth,
      accessToken: info.accessToken,
      refreshToken: info.refreshToken,
      expiresAt: info.expiresAt,
    });
  } catch (err: any) {
    console.error("/api/auth/token POST refresh error", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
