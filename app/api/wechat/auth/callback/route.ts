import {
  getWechatAccessToken,
  getCachedWechatToken,
} from "@/lib/wechatTokenService";
import { NextRequest, NextResponse } from "next/server";

// 标记为动态路由，避免静态生成
export const dynamic = "force-dynamic";

const WECHAT_GET_USERINFO_URL =
  "https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo";
const WECHAT_GET_USER_DETAIL_URL = "https://qyapi.weixin.qq.com/cgi-bin/user/get";

/**
 * GET /api/wechat/auth/callback
 * 处理企业微信授权回调，获取用户信息
 *
 * 查询参数：
 * - code: string（必填）- 授权码
 * - state?: string（可选）- 状态参数
 * - corpid?: string（可选）- 企业ID，未提供时使用环境变量
 * - secret?: string（可选）- 应用Secret，未提供时使用环境变量
 * - agentid?: string（可选）- 应用ID，未提供时使用环境变量
 * - include_detail?: boolean（可选）- 是否包含用户详细信息，默认false
 *
 * 返回格式：
 * {
 *   success: boolean,
 *   data?: {
 *     userid: string,          // 用户ID
 *     user_ticket?: string,     // 用户票据（用于获取用户详细信息）
 *     user_detail?: object     // 用户详细信息（如果 include_detail=true）
 *   },
 *   error?: string
 * }
 *
 * 使用示例：
 * GET /api/wechat/auth/callback?code=xxx&include_detail=true
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const corpid = searchParams.get("corpid");
    const secret = searchParams.get("secret");
    const agentid = searchParams.get("agentid");
    const includeDetail = searchParams.get("include_detail") === "true";

    // 参数验证
    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "code parameter is required",
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

    // 获取 access_token
    let accessToken: string;
    try {
      const cachedToken = getCachedWechatToken();
      if (cachedToken) {
        accessToken = cachedToken;
      } else {
        accessToken = await getWechatAccessToken(corpid || "", secret || "");
      }
    } catch (tokenError: any) {
      console.error("[wechat-auth-callback] 获取 access_token 失败", tokenError);
      return NextResponse.json(
        {
          success: false,
          error: `获取 access_token 失败: ${tokenError.message}`,
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

    // 通过 code 获取 userid
    const getUserInfoUrl = `${WECHAT_GET_USERINFO_URL}?access_token=${accessToken}&code=${code}`;

    console.log("[wechat-auth-callback] 获取用户信息", {
      code,
      state,
    });

    const userInfoResp = await fetch(getUserInfoUrl, {
      method: "GET",
    });

    if (!userInfoResp.ok) {
      const text = await userInfoResp.text();
      console.error("[wechat-auth-callback] 获取用户信息失败", {
        status: userInfoResp.status,
        response: text,
      });

      return NextResponse.json(
        {
          success: false,
          error: `获取用户信息失败: ${userInfoResp.status}. Response: ${text}`,
        },
        {
          status: userInfoResp.status,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    const userInfoData: any = await userInfoResp.json();

    // 检查企业微信 API 返回的错误码
    if (userInfoData.errcode && userInfoData.errcode !== 0) {
      console.error("[wechat-auth-callback] 企业微信 API 返回错误", userInfoData);
      return NextResponse.json(
        {
          success: false,
          error: `获取用户信息失败: ${userInfoData.errcode} - ${userInfoData.errmsg}`,
          errcode: userInfoData.errcode,
          errmsg: userInfoData.errmsg,
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

    const result: any = {
      userid: userInfoData.userid || userInfoData.UserId || "",
      user_ticket: userInfoData.user_ticket || "",
    };

    // 如果需要获取用户详细信息
    if (includeDetail && result.userid) {
      try {
        const getUserDetailUrl = `${WECHAT_GET_USER_DETAIL_URL}?access_token=${accessToken}&userid=${result.userid}`;

        const userDetailResp = await fetch(getUserDetailUrl, {
          method: "GET",
        });

        if (userDetailResp.ok) {
          const userDetailData: any = await userDetailResp.json();
          if (userDetailData.errcode === 0) {
            result.user_detail = userDetailData;
          }
        }
      } catch (detailError) {
        console.error("[wechat-auth-callback] 获取用户详细信息失败", detailError);
        // 不阻断流程，只记录错误
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
        state,
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
    console.error("/api/wechat/auth/callback GET error", err);
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

