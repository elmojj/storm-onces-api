import { postOnesGraphql } from "@/lib/onesGraphql";
import { NextRequest, NextResponse } from "next/server";

// 标记为动态路由，避免静态生成
export const dynamic = "force-dynamic";

// 默认的 GraphQL 查询（获取所有任务）
const DEFAULT_QUERY = {
  query: `{
    buckets (
      groupBy: $groupBy
      orderBy: $groupOrderBy
      pagination: $pagination
      filter: $groupFilter
    ) {
      key
      
      tasks (
        filterGroup: $filterGroup
        orderBy: $orderBy
        limit: 1000
        
      includeAncestors:{pathField:"path"}
      orderByPath: "path"
    
      ) {
        
    key
    name
    uuid
    number
    path
    project {
      uuid
    }
    assign {
      key
      uuid
      name
      avatar
    }
    status {
      uuid
      name
      category
    }
    totalManhour
    totalEstimatedHours
    sprint {
      key
      uuid
      name
    }
      }
      pageInfo {
        count
        totalCount
        startPos
        startCursor
        endPos
        endCursor
        hasNextPage
        preciseCount
      }
    }
    __extensions
  }`,
  variables: {
    groupBy: { tasks: {} },
    groupOrderBy: null,
    orderBy: { position: "ASC", createTime: "DESC" },
    filterGroup: [{ project_in: ["9JXgFFByHdimtBXW"] }],
    search: null,
    pagination: { limit: 1000, preciseCount: false },
  },
};

/**
 * GET /api/tasks/by-user
 * 根据用户名过滤任务，并按 sprint 分类汇总
 *
 * 查询参数：
 *   - userName: 用户名（必填）
 *   - productId: 产品 ID（可选）
 *
 * 返回格式：
 * {
 *   [sprintName]: [
 *     {
 *       key: string,
 *       path: string,
 *       projectUuid: string,
 *       name: string,
 *       number: number,
 *       status: {
 *         uuid: string,
 *         name: string,
 *         category: string
 *       } | null,
 *       usedTime: number
 *     }
 *   ]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userName = searchParams.get("userName");
    const productId = searchParams.get("productId");

    if (!userName) {
      return NextResponse.json(
        { error: "userName parameter is required" },
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

    // 构建查询变量
    const variables: any = { ...DEFAULT_QUERY.variables };

    // 如果提供了 productId，更新 filterGroup
    if (productId) {
      // 将 productId 添加到 filterGroup 中
      const filterGroup = [...(variables.filterGroup || [])];
      filterGroup.push({ product_in: [productId] });
      variables.filterGroup = filterGroup;
    }

    // 获取所有任务数据
    const queryBody = {
      query: DEFAULT_QUERY.query,
      variables,
    };
    const response = await postOnesGraphql(queryBody);
    const data = response.data;

    if (!data?.buckets) {
      return NextResponse.json(
        { error: "Invalid response format from ONES API" },
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

    // 按 sprint 分类汇总任务
    const result: Record<
      string,
      Array<{
        key: string;
        path: string;
        projectUuid: string;
        name: string;
        number: number;
        status: string | null;
        usedTime: number;
        taskUrl: string;
      }>
    > = {};

    // 遍历所有 buckets
    for (const bucket of data.buckets) {
      // 遍历该 bucket 下的所有任务
      if (bucket.tasks && Array.isArray(bucket.tasks)) {
        for (const task of bucket.tasks) {
          // 检查任务的 assign.name 是否匹配用户名
          if (task.assign?.name === userName) {
            // 获取 sprint 名称，如果没有 sprint 则归类到 "未分配"
            const sprintName = task.sprint?.name || "未分配";

            // 初始化该 sprint 的数组（如果不存在）
            if (!result[sprintName]) {
              result[sprintName] = [];
            }

            // 添加任务信息
            result[sprintName].push({
              key: task.key || "",
              path: task.path || "",
              projectUuid: task.project?.uuid || "",
              name: task.name || "",
              number: task.number || 0,
              status: task.status ? task.status.name : null,
              usedTime: (task.totalEstimatedHours || 0) / 100000,
              taskUrl: `https://ones.cn/project/#/team/ApkexV6i/task/${task.path}`,
            });
          }
        }
      }
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    console.error("/api/tasks/by-user GET error", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
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
