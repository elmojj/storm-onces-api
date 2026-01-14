import {
  getWechatAccessToken,
  getCachedWechatToken,
} from "@/lib/wechatTokenService";
import { NextRequest, NextResponse } from "next/server";

// 标记为动态路由，避免静态生成
export const dynamic = "force-dynamic";

const WECHAT_GET_USER_DETAIL_URL = "https://qyapi.weixin.qq.com/cgi-bin/user/get";

/**
 * POST /api/wechat/auth/userinfo
 * 通过 userid 获取用户详细信息
 *
 * Content-Type: application/json
 *
 * 请求体：
 * {
 *   userid: string,           // 用户ID（必填）
 *   corpid?: string,          // 企业ID（可选，优先使用环境变量）
 *   secret?: string           // 应用Secret（可选，优先使用环境变量）
 * }
 *
 * 返回格式：
 * {
 *   success: boolean,
 *   data?: {
 *     userid: string,
 *     name: string,
 *     mobile: string,
 *     email: string,
 *     avatar: string,
 *     // ... 其他用户信息
 *   },
 *   error?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // 验证 Content-Type
    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
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

    const body = await req.json();
    const { userid, corpid, secret } = body;

    // 参数验证
    if (!userid || typeof userid !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "userid parameter is required and must be a non-empty string",
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
      console.error("[wechat-auth-userinfo] 获取 access_token 失败", tokenError);
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

    // 获取用户详细信息
    const getUserDetailUrl = `${WECHAT_GET_USER_DETAIL_URL}?access_token=${accessToken}&userid=${userid}`;

    console.log("[wechat-auth-userinfo] 获取用户详细信息", {
      userid,
    });

    const userDetailResp = await fetch(getUserDetailUrl, {
      method: "GET",
    });

    if (!userDetailResp.ok) {
      const text = await userDetailResp.text();
      console.error("[wechat-auth-userinfo] 获取用户详细信息失败", {
        status: userDetailResp.status,
        response: text,
      });

      return NextResponse.json(
        {
          success: false,
          error: `获取用户详细信息失败: ${userDetailResp.status}. Response: ${text}`,
        },
        {
          status: userDetailResp.status,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    const userDetailData: any = await userDetailResp.json();

    // 检查企业微信 API 返回的错误码
    if (userDetailData.errcode && userDetailData.errcode !== 0) {
      console.error("[wechat-auth-userinfo] 企业微信 API 返回错误", userDetailData);
      return NextResponse.json(
        {
          success: false,
          error: `获取用户详细信息失败: ${userDetailData.errcode} - ${userDetailData.errmsg}`,
          errcode: userDetailData.errcode,
          errmsg: userDetailData.errmsg,
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

    return NextResponse.json(
      {
        success: true,
        data: userDetailData,
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
    console.error("/api/wechat/auth/userinfo POST error", err);
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

