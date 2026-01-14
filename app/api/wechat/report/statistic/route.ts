import {
  getCachedWechatToken,
  getWechatAccessToken,
} from "@/lib/wechatTokenService";
import { NextRequest, NextResponse } from "next/server";

// 标记为动态路由，避免静态生成
export const dynamic = "force-dynamic";

const WECHAT_REPORT_STATISTIC_URL =
  "https://qyapi.weixin.qq.com/cgi-bin/report/get_statistic";

/**
 * POST /api/wechat/report/statistic
 * 获取汇报统计信息
 *
 * Content-Type: application/json
 *
 * 请求体：
 * {
 *   template_id: string,     // 汇报模板ID（必填）
 *   start_time?: number,      // 开始时间戳（可选）
 *   end_time?: number,        // 结束时间戳（可选）
 *   corpid?: string,          // 企业ID（可选，优先使用环境变量）
 *   secret?: string           // 应用Secret（可选，优先使用环境变量）
 * }
 *
 * 返回格式：
 * {
 *   success: boolean,
 *   data?: {
 *     statistics: Array,      // 统计信息列表
 *     // 包含未读、已提交数量等信息
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
    const { template_id, start_time, end_time, corpid, secret } = body;

    // 参数验证
    if (!template_id || typeof template_id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error:
            "template_id parameter is required and must be a non-empty string",
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
      // 先尝试使用缓存的 token
      const cachedToken = getCachedWechatToken();
      if (cachedToken) {
        accessToken = cachedToken;
      } else {
        accessToken = await getWechatAccessToken(corpid, secret);
      }
    } catch (tokenError: any) {
      console.error(
        "[wechat-report-statistic] 获取 access_token 失败",
        tokenError
      );
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

    // 构建请求体
    const requestBody: any = {
      template_id,
    };
    if (start_time) requestBody.start_time = start_time;
    if (end_time) requestBody.end_time = end_time;

    console.log("[wechat-report-statistic] 请求信息", {
      url: WECHAT_REPORT_STATISTIC_URL,
      template_id,
      start_time,
      end_time,
    });

    // 调用企业微信 API
    const resp = await fetch(
      `${WECHAT_REPORT_STATISTIC_URL}?access_token=${accessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      console.error("[wechat-report-statistic] 请求失败", {
        status: resp.status,
        statusText: resp.statusText,
        response: text,
      });

      return NextResponse.json(
        {
          success: false,
          error: `获取汇报统计失败: ${resp.status}. Response: ${text}`,
        },
        {
          status: resp.status,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    const data: any = await resp.json();

    // 检查企业微信 API 返回的错误码
    if (data.errcode && data.errcode !== 0) {
      console.error("[wechat-report-statistic] 企业微信 API 返回错误", data);
      return NextResponse.json(
        {
          success: false,
          error: `获取汇报统计失败: ${data.errcode} - ${data.errmsg}`,
          errcode: data.errcode,
          errmsg: data.errmsg,
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
        data: {
          statistics: data.statistics || [],
        },
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
    console.error("/api/wechat/report/statistic POST error", err);
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
