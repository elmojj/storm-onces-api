import { postOnesGraphql } from "@/lib/onesGraphql";
import { NextRequest, NextResponse } from "next/server";

// 标记为动态路由
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
    serverUpdateStamp
    number
    path
    subTaskCount
    subTaskDoneCount
    position
    status {
      uuid
      name
      category
    }
    deadline(unit: ONESDATE)
    subTasks {
      uuid
    }
    issueType {
      uuid
      manhourStatisticMode
    }
    subIssueType {
      uuid
      manhourStatisticMode
    }
    project {
      uuid
    }
    parent {
      uuid
    }
    estimatedHours
    remainingManhour
    totalEstimatedHours
    totalRemainingHours
    issueTypeScope {
      uuid
    }

        
    hasEditPermission(attachPermission:{
      permissions:[update_tasks],
    })
  
        number
      
        name
      
        
    priority {
      bgColor
      color
      uuid
      value
      position
    }
  
      
        
    status {
      uuid
      name
    }
  
      
        
    assign {
      key
      uuid
      name
      avatar
    }
  
      deadline(unit: ONESDATE)
        estimatedHours
      
        totalManhour
      
        remainingManhour
      
        
    owner {
      key
      uuid
      name
      avatar
    }
  
      
        createTime
      
        
    sprint {
      key
      uuid
      name
    }
  
      
        
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

// GET /api/tasks
// 支持查询参数：
//   - query: GraphQL query 字符串（可选，不提供则使用默认）
//   - variables: JSON 字符串格式的 variables（可选，不提供则使用默认）
//   - projectId: 项目 ID（可选，不提供则使用默认值 "9JXgFFByHdimtBXW"）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryParam = searchParams.get("query");
    const variablesParam = searchParams.get("variables");
    const projectIdParam = searchParams.get("projectId");

    let body: any;

    if (queryParam || variablesParam) {
      // 如果提供了查询参数，使用提供的参数
      const variables = variablesParam
        ? JSON.parse(decodeURIComponent(variablesParam))
        : { ...DEFAULT_QUERY.variables };

      // 如果提供了 projectId，更新 filterGroup
      if (projectIdParam) {
        variables.filterGroup = [{ project_in: [projectIdParam] }];
      }

      body = {
        query: queryParam || DEFAULT_QUERY.query,
        variables,
      };
    } else {
      // 如果没有提供参数，使用默认查询
      const variables = { ...DEFAULT_QUERY.variables };

      // 如果提供了 projectId，更新 filterGroup
      if (projectIdParam) {
        variables.filterGroup = [{ project_in: [projectIdParam] }];
      }

      body = {
        query: DEFAULT_QUERY.query,
        variables,
      };
    }

    const data = await postOnesGraphql(body);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("/api/tasks GET error", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/tasks
// 入参为 JSON，直接转发到 ONES GraphQL 接口
// 支持在请求体中提供 projectId 参数，会自动更新 variables.filterGroup
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = body.projectId;

    // 如果提供了 projectId，更新 filterGroup
    if (projectId && body.variables) {
      body.variables = {
        ...body.variables,
        filterGroup: [{ project_in: [projectId] }],
      };
    } else if (projectId && !body.variables) {
      // 如果没有提供 variables，使用默认的 variables 并更新 projectId
      body.variables = {
        ...DEFAULT_QUERY.variables,
        filterGroup: [{ project_in: [projectId] }],
      };
    }

    // 这里不做强校验，直接转发。你给的 query/variables 可以直接作为 body 传入。
    const data = await postOnesGraphql(body);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("/api/tasks error", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
