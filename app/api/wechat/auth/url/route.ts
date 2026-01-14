import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// 标记为动态路由，避免静态生成
export const dynamic = "force-dynamic";

const WECHAT_OAUTH_AUTHORIZE_URL =
  "https://open.weixin.qq.com/connect/oauth2/authorize";

/**
 * GET /api/wechat/auth/url
 * 生成企业微信授权登录URL
 *
 * 查询参数：
 * - redirect_uri: string（必填）- 授权后重定向的URI，需要urlencode
 * - agentid?: string（可选）- 应用ID，未提供时使用环境变量 WECHAT_AGENTID
 * - state?: string（可选）- 用于保持请求和回调的状态参数
 * - corpid?: string（可选）- 企业ID，未提供时使用环境变量 WECHAT_CORPID
 * - scope?: string（可选）- 授权作用域，默认为 snsapi_base（静默授权）
 *
 * 返回格式：
 * {
 *   success: boolean,
 *   url?: string,        // 授权URL
 *   error?: string
 * }
 *
 * 使用示例：
 * GET /api/wechat/auth/url?redirect_uri=http://localhost:3000/callback&agentid=1000002
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const redirectUri = searchParams.get("redirect_uri");
    const agentid = searchParams.get("agentid");
    const state = searchParams.get("state");
    const corpid = searchParams.get("corpid");
    const scope = searchParams.get("scope") || "snsapi_base";

    // 参数验证
    if (!redirectUri) {
      return NextResponse.json(
        {
          success: false,
          error: "redirect_uri parameter is required",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    // 获取配置
    const corpId = corpid || process.env.WECHAT_CORPID || "";
    const appAgentId = agentid || process.env.WECHAT_AGENTID || "";

    if (!corpId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "企业微信 corpid 未配置，请设置环境变量 WECHAT_CORPID 或通过参数传入",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    if (!appAgentId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "企业微信 agentid 未配置，请设置环境变量 WECHAT_AGENTID 或通过参数传入",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    // 生成 state（如果未提供）
    const finalState = state || crypto.randomBytes(16).toString("hex");

    // 构建授权URL
    const params = new URLSearchParams({
      appid: corpId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scope,
      agentid: appAgentId,
      state: finalState,
    });

    const authUrl = `${WECHAT_OAUTH_AUTHORIZE_URL}?${params.toString()}#wechat_redirect`;

    console.log("[wechat-auth-url] 生成授权URL", {
      corpid: corpId,
      agentid: appAgentId,
      redirect_uri: redirectUri,
      scope,
      state: finalState,
    });

    return NextResponse.json(
      {
        success: true,
        url: authUrl,
        state: finalState,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: any) {
    console.error("/api/wechat/auth/url GET error", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal Server Error",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}

