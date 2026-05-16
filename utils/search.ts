import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function splitMarkdown(content: string) {
  return content
    .split(/\n#{1,3}\s/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function readMarkdownFiles() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".md"));

  let chunks: string[] = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);

    const content = fs.readFileSync(filePath, "utf-8");

    const sections = splitMarkdown(content);

    chunks.push(...sections);
  }

  return chunks;
}

export function searchDocuments(query: string) {
  const chunks = readMarkdownFiles();

  const q = normalize(query);

  const words = q
    .split(" ")
    .filter((w) => w.length >= 2);

  const scored = chunks.map((chunk) => {
    const text = normalize(chunk);

    let score = 0;

    if (text.includes(q)) score += 100;

    for (const word of words) {
      if (text.includes(word)) score += 10;
    }

    return {
      text: chunk,
      score,
    };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.text);
}