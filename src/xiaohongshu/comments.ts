
function collectComments(
  value: any,
  results: any[],
  seen: Set<string>,
  depth = 0
) {
  if (!value || typeof value !== "object" || depth > 15) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectComments(item, results, seen, depth + 1);
    }
    return;
  }

  const content =
    value.content ||
    value.text ||
    value.noteComment?.content;

  const user =
    value.userInfo ||
    value.user ||
    value.user_info ||
    {};

  if (
    typeof content === "string" &&
    content.trim() &&
    (value.commentId || value.id || value.createTime)
  ) {
    const id = String(
      value.commentId || value.id
    );

    if (!seen.has(id)) {
      seen.add(id);

      results.push({
        id,
        user: user.nickname ||
          user.nickName ||
          "",
        userId: user.userId ||
          user.id ||
          "",
        content: content.trim(),
        createTime: value.createTime ||
          value.time ||
          null,
        likeCount: value.likeCount ||
          value.like_count ||
          0,
        replies: []
      });
    }
  }

  for (const item of Object.values(value)) {
    collectComments(item, results, seen, depth + 1);
  }
}

export function parseComments(state: any) {
  const results: any[] = [];
  const seen = new Set<string>();

  if (state) {
    collectComments(state, results, seen);
  }

  return {
    count: results.length,
    comments: results
  };
}
