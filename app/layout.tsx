
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xiaohongshu Reader",
  description: "小红书笔记解析 MCP 服务"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
