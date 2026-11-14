
import * as cheerio from "cheerio";

function extractJsonObject(source: string, start: number): string | null {
  const begin = source.indexOf("{", start);

  if (begin < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = begin; i < source.length; i++) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;

      if (depth === 0) {
        return source.slice(begin, i + 1);
      }
    }
  }

  return null;
}

export function extractInitialState(html: string): any {
  const $ = cheerio.load(html);

  const scripts = $("script")
    .map((_, element) => $(element).html() || "")
    .get();

  for (const script of scripts) {
    const index = script.indexOf("__INITIAL_STATE__");

    if (index < 0) continue;

    const json = extractJsonObject(script, index);

    if (!json) continue;

    try {
      return JSON.parse(json);
    } catch {
      continue;
    }
  }

  return null;
}

function findNoteObject(
  value: any,
  noteId: string,
  depth = 0
): any {
  if (!value || typeof value !== "object" || depth > 15) {
    return null;
  }

  if (
    value.noteId === noteId ||
    value.note_id === noteId ||
    value.id === noteId
  ) {
    if (
      value.title ||
      value.desc ||
      value.images ||
      value.imageList
    ) {
      return value;
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findNoteObject(item, noteId, depth + 1);
      if (result) return result;
    }
  } else {
    for (const item of Object.values(value)) {
      const result = findNoteObject(item, noteId, depth + 1);
      if (result) return result;
    }
  }

  return null;
}

export function parseNote(html: string, noteId: string) {
  const $ = cheerio.load(html);

  const state = extractInitialState(html);
  const note = state
    ? findNoteObject(state, noteId)
    : null;

  const title =
    note?.title ||
    $('meta[property="og:title"]').attr("content") ||
    $("title").text() ||
    "";

  const desc =
    note?.desc ||
    note?.content ||
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  const images = (
    note?.imageList ||
    note?.images ||
    note?.image_list ||
    []
  ).map((item: any) => {
    if (typeof item === "string") return item;

    return (
      item.urlDefault ||
      item.url ||
      item.urlPre ||
      item.infoList?.[0]?.url ||
      ""
    );
  }).filter(Boolean);

  return {
    success: Boolean(title || desc || note),
    noteId,
    title,
    desc,
    author: note?.user?.nickname ||
      note?.user?.nickName ||
      note?.nickname ||
      "",
    authorId: note?.user?.userId ||
      note?.user?.id ||
      "",
    publishTime: note?.time ||
      note?.publishTime ||
      note?.createTime ||
      null,
    images,
    rawAvailable: Boolean(state),
    note
  };
}

export function extractNoteId(input: string): string {
  const url = new URL(input);

  const match =
    url.pathname.match(/\/explore\/([a-zA-Z0-9]+)/) ||
    url.pathname.match(/\/discovery\/item\/([a-zA-Z0-9]+)/);

  if (!match) {
    throw new Error("无法从链接中提取笔记 ID");
  }

  return match[1];
}
