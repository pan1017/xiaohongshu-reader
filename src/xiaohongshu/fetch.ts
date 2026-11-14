
const ALLOWED_HOSTS = [
  "www.xiaohongshu.com",
  "xiaohongshu.com",
  "xhslink.com"
];

export function normalizeXhsUrl(input: string): string {
  const url = new URL(input);

  if (
    url.protocol !== "https:" ||
    !ALLOWED_HOSTS.some(
      host => url.hostname === host ||
      url.hostname.endsWith("." + host)
    )
  ) {
    throw new Error("不支持的小红书链接");
  }

  return url.toString();
}

export async function fetchXhsPage(input: string) {
  const cookie = process.env.XHS_COOKIE;

  if (!cookie) {
    throw new Error("未配置 XHS_COOKIE");
  }

  const url = normalizeXhsUrl(input);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "Cookie": cookie,
      "Referer": "https://www.xiaohongshu.com/"
    },
    redirect: "manual",
    signal: AbortSignal.timeout(15000)
  });

  if (response.status >= 300 && response.status < 400) {
    throw new Error("小红书发生重定向，可能需要重新登录");
  }

  if (!response.ok) {
    throw new Error(`小红书请求失败：HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    throw new Error("返回内容不是 HTML 页面");
  }

  const html = await response.text();

  if (
    html.includes("验证码") ||
    html.includes("访问异常") ||
    html.includes("captcha")
  ) {
    throw new Error("小红书页面触发验证或访问限制");
  }

  return {
    html,
    url
  };
}
