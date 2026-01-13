import { refreshOnesToken } from "@/lib/tokenService";
import { getAuthorizationHeader } from "@/lib/tokenStore";
import { NextRequest, NextResponse } from "next/server";

// 标记为动态路由，避免静态生成
export const dynamic = "force-dynamic";

const CREATE_TASK_URL =
  "https://sz.ones.cn/project/api/project/team/ApkexV6i/tasks/add3";

/**
 * 生成项目 UUID（16个字符）
 * 格式：大小写字母和数字的组合
 */
function generateProjectUuid(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成任务类型 UUID（8个字符）
 * 格式：大小写字母和数字的组合
 */
function generateIssueTypeUuid(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * POST /api/tasks/create
 * 创建新任务
 *
 * Content-Type: application/json
 *
 * 请求体：
 * {
 *   title: string,        // 任务标题（必传）
 *   description?: string, // 任务描述（可选）
 *   userId: string       // 用户ID（必传）
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
    const { title, description, userId } = body;

    // 参数验证
    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { error: "title parameter is required and must be a non-empty string" },
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

    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return NextResponse.json(
        {
          error: "userId parameter is required and must be a non-empty string",
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

    // 获取 Authorization header
    let auth = getAuthorizationHeader();

    // 如果没有 auth，先尝试刷新一次
    if (!auth) {
      console.log("[create-task] 没有 token，尝试刷新...");
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

    // 自动生成 project_uuid 和 issue_type_uuid
    const projectUuid = generateProjectUuid();
    const issueTypeUuid = "H9zunzPC"; //generateIssueTypeUuid();

    // 生成任务 UUID（基于 userId 和时间戳生成唯一ID）
    // 格式：userId + 8位随机字符，确保总长度为16
    const generateTaskUuid = (baseUserId: string): string => {
      const randomPart = Math.random()
        .toString(36)
        .substring(2, 10)
        .padEnd(8, "0");
      return (baseUserId + randomPart).substring(0, 16);
    };

    const taskUuid = generateTaskUuid(userId);

    // 构建 field_values
    const fieldValues: any[] = [
      {
        field_uuid: "field004",
        type: 8,
        value: userId,
      },
    ];

    // 如果有描述，添加到 field_values
    if (description && typeof description === "string") {
      fieldValues.push({
        field_uuid: "field016",
        type: 20,
        value: `<p>${description}</p>\n`,
      });
    }

    // 构建请求体
    const requestBody = {
      tasks: [
        {
          uuid: taskUuid,
          assign: userId,
          summary: title.trim(),
          parent_uuid: "",
          field_values: fieldValues,
          issue_type_uuid: issueTypeUuid,
          project_uuid: "Ai5bfAgBs5JkNEwE", //projectUuid,
          watchers: [userId],
        },
      ],
    };

    console.log("[create-task] 请求信息", {
      url: CREATE_TASK_URL,
      title,
      userId,
      taskUuid,
      projectUuid,
      issueTypeUuid,
    });

    // 调用 ONES API
    const resp = await fetch(CREATE_TASK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "zh",
      },
      body: JSON.stringify(requestBody),
    });

    // 如果是 401 错误，尝试刷新 token 后重试
    if (resp.status === 401) {
      console.log("[create-task] 收到 401 错误，尝试刷新 token 后重试...");
      try {
        await refreshOnesToken();
        auth = getAuthorizationHeader();
        if (auth) {
          const retryResp = await fetch(CREATE_TASK_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: auth,
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "zh",
            },
            body: JSON.stringify(requestBody),
          });

          if (!retryResp.ok) {
            const text = await retryResp.text();
            console.error(
              "[create-task] 重试后仍然失败",
              retryResp.status,
              text
            );
            return NextResponse.json(
              {
                success: false,
                error: `Create task failed: ${retryResp.status}. Response: ${text}`,
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
        console.error("[create-task] 刷新 token 失败", refreshError);
        const text = await resp.text();
        return NextResponse.json(
          {
            success: false,
            error: `Create task failed: 401 (Unauthorized). Token refresh failed. Response: ${text}`,
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
      let errorMessage = `Create task failed: ${resp.status}. Response: ${text}`;

      // 尝试解析错误响应
      try {
        const errorData = JSON.parse(text);
        if (errorData.error || errorData.message) {
          errorMessage = `创建任务失败: ${errorData.error || errorData.message}`;
        }
      } catch {
        // 如果解析失败，使用原始文本
      }

      console.error("[create-task] 请求失败", {
        status: resp.status,
        statusText: resp.statusText,
        response: text,
        url: CREATE_TASK_URL,
        title,
        userId,
      });

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: {
            status: resp.status,
            title,
            userId,
            url: CREATE_TASK_URL,
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
    console.error("/api/tasks/create POST error", err);
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
