import { refreshOnesToken } from "@/lib/tokenService";
import { getAuthorizationHeader } from "@/lib/tokenStore";
import { NextRequest, NextResponse } from "next/server";

// 标记为动态路由，避免静态生成
export const dynamic = "force-dynamic";

const UPDATE_MANHOUR_URL =
  "https://sz.ones.cn/project/api/project/team/ApkexV6i/task";

/**
 * POST /api/tasks/update-manhour
 * 更新任务工时
 *
 * Content-Type: application/json
 *
 * 请求体：
 * {
 *   taskId: string,  // 任务ID（可以使用任务的 key 或 uuid），例如 "Ai5bfAgBEmOllWPC"
 *   usedTime: number // 工时（小时），例如 2，会自动转换为 value = usedTime * 100000
 * }
 *
 * 返回格式：
 * {
 *   success: boolean,
 *   message?: string,
 *   data?: any
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
    const { taskId, usedTime } = body;

    // 参数验证
    if (!taskId) {
      return NextResponse.json(
        { error: "taskId parameter is required" },
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

    if (typeof usedTime !== "number" || usedTime < 0) {
      return NextResponse.json(
        { error: "usedTime must be a non-negative number" },
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

    // 获取 Authorization header
    let auth = getAuthorizationHeader();

    // 如果没有 auth，先尝试刷新一次
    if (!auth) {
      console.log("[update-manhour] 没有 token，尝试刷新...");
      await refreshOnesToken();
      auth = getAuthorizationHeader();
    }

    if (!auth) {
      return NextResponse.json(
        { error: "No Authorization available" },
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

    // 计算 value（usedTime * 100000）
    const value = Math.round(usedTime * 100000);

    // 构建请求 URL
    const url = `${UPDATE_MANHOUR_URL}/${taskId}/assess_manhour/update`;

    console.log("[update-manhour] 请求信息", {
      url,
      taskId,
      usedTime,
      value,
      taskIdLength: taskId.length,
    });

    // 调用 ONES API
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "zh",
      },
      body: JSON.stringify({ value }),
    });

    // 如果是 401 错误，尝试刷新 token 后重试
    if (resp.status === 401) {
      console.log("[update-manhour] 收到 401 错误，尝试刷新 token 后重试...");
      try {
        await refreshOnesToken();
        auth = getAuthorizationHeader();
        if (auth) {
          const retryResp = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: auth,
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "zh",
            },
            body: JSON.stringify({ value }),
          });

          if (!retryResp.ok) {
            const text = await retryResp.text();
            console.error(
              "[update-manhour] 重试后仍然失败",
              retryResp.status,
              text
            );
            return NextResponse.json(
              {
                success: false,
                error: `Update manhour failed: ${retryResp.status}. Response: ${text}`,
              },
              {
                status: retryResp.status,
                headers: {
                  "Cache-Control":
                    "no-store, no-cache, must-revalidate, max-age=0",
                  Pragma: "no-cache",
                  Expires: "0",
                },
              }
            );
          }

          const retryData = await retryResp.json();
          return NextResponse.json(
            {
              success: true,
              data: retryData,
            },
            {
              headers: {
                "Cache-Control":
                  "no-store, no-cache, must-revalidate, max-age=0",
                Pragma: "no-cache",
                Expires: "0",
              },
            }
          );
        }
      } catch (refreshError) {
        console.error("[update-manhour] 刷新 token 失败", refreshError);
        const text = await resp.text();
        return NextResponse.json(
          {
            success: false,
            error: `Update manhour failed: 401 (Unauthorized). Token refresh failed. Response: ${text}`,
          },
          {
            status: 401,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );
      }
    }

    if (!resp.ok) {
      const text = await resp.text();
      let errorMessage = `Update manhour failed: ${resp.status}. Response: ${text}`;

      // 尝试解析错误响应
      try {
        const errorData = JSON.parse(text);
        if (errorData.errcode === "NotFound.Task") {
          errorMessage = `任务未找到 (404): taskId "${taskId}" 不存在或无权访问。请确认：\n1. taskId 是否正确（可以使用任务的 key 或 uuid）\n2. 任务是否在当前项目中\n3. 是否有权限访问该任务`;
        } else if (errorData.error || errorData.message) {
          errorMessage = `更新工时失败: ${errorData.error || errorData.message}`;
        }
      } catch {
        // 如果解析失败，使用原始文本
      }

      console.error("[update-manhour] 请求失败", {
        status: resp.status,
        statusText: resp.statusText,
        response: text,
        url,
        taskId,
        value,
      });

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: {
            status: resp.status,
            taskId,
            url,
          },
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

    const data = await resp.json();

    return NextResponse.json(
      {
        success: true,
        data,
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
    console.error("/api/tasks/update-manhour POST error", err);
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
