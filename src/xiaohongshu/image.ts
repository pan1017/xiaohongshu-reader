
const IMAGE_HOSTS = [
  "xhscdn.com",
  "xiaohongshu.com"
];

export async function imageToBase64(imageUrl: string) {
  const url = new URL(imageUrl);

  if (
    url.protocol !== "https:" ||
    !IMAGE_HOSTS.some(
      host => url.hostname === host ||
      url.hostname.endsWith("." + host)
    )
  ) {
    throw new Error("不允许下载该图片地址");
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36",
      "Referer": "https://www.xiaohongshu.com/"
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`图片下载失败：HTTP ${response.status}`);
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.startsWith("image/")) {
    throw new Error("目标资源不是图片");
  }

  const MAX_SIZE = 2 * 1024 * 1024;

  const declaredSize = Number(
    response.headers.get("content-length") || 0
  );

  if (declaredSize > MAX_SIZE) {
    throw new Error("图片超过 2MB 限制");
  }

  if (!response.body) {
    throw new Error("图片响应为空");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    total += value.length;

    if (total > MAX_SIZE) {
      await reader.cancel();
      throw new Error("图片超过 2MB 限制");
    }

    chunks.push(value);
  }

  const buffer = Buffer.concat(
    chunks.map(chunk => Buffer.from(chunk))
  );

  return {
    success: true,
    mimeType: contentType.split(";")[0],
    size: buffer.length,
    base64: `data:${contentType.split(";")[0]};base64,${buffer.toString("base64")}`
  };
}
