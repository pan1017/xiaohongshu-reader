
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import { fetchXhsPage } from "@/src/xiaohongshu/fetch";
import {
  parseNote,
  extractInitialState,
  extractNoteId
} from "@/src/xiaohongshu/parser";
import { parseComments } from "@/src/xiaohongshu/comments";
import { imageToBase64 } from "@/src/xiaohongshu/image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createMcpHandler(
  (server) => {

    // 工具一：获取笔记内容
    server.tool(
      "fetch_xiaohongshu_note",
      "获取小红书笔记的标题、正文、作者、发布时间和图片地址",
      {
        url: z.string().url()
      },
      async ({ url }) => {
        try {
          const page = await fetchXhsPage(url);
          const noteId = extractNoteId(page.url);
          const result = parseNote(page.html, noteId);

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: error.message || "笔记解析失败"
              }
            ]
          };
        }
      }
    );

    // 工具二：获取评论
    server.tool(
      "fetch_xiaohongshu_comments",
      "获取小红书笔记页面中实际提供的评论和回复数据",
      {
        url: z.string().url()
      },
      async ({ url }) => {
        try {
          const page = await fetchXhsPage(url);
          const state = extractInitialState(page.html);
          const result = parseComments(state);

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: true,
                  noteId: extractNoteId(page.url),
                  ...result,
                  message: result.count === 0
                    ? "页面中未找到可解析的评论数据"
                    : "评论解析完成"
                }, null, 2)
              }
            ]
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: error.message || "评论获取失败"
              }
            ]
          };
        }
      }
    );

    // 工具三：图片转 Base64
    server.tool(
      "fetch_xiaohongshu_image",
      "下载小红书笔记图片并转换成 Base64",
      {
        image_url: z.string().url()
      },
      async ({ image_url }) => {
        try {
          const result = await imageToBase64(image_url);

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result)
              }
            ]
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: error.message || "图片转换失败"
              }
            ]
          };
        }
      }
    );

  },
  {
    serverInfo: {
      name: "xiaohongshu-reader",
      version: "1.0.0"
    }
  }
);

async function authorizedHandler(request: Request) {
  const token = process.env.MCP_ACCESS_TOKEN;

  if (!token) {
    return new Response(
      JSON.stringify({
        error: "MCP_ACCESS_TOKEN 未配置"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  const authorization =
    request.headers.get("authorization");

  if (authorization !== `Bearer ${token}`) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized"
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  return handler(request);
}

export async function GET(request: Request) {
  return authorizedHandler(request);
}

export async function POST(request: Request) {
  return authorizedHandler(request);
}

export async function DELETE(request: Request) {
  return authorizedHandler(request);
}
