import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function readMarkdownFiles() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".md"));

  let allSections: string[] = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);

    const content = fs.readFileSync(filePath, "utf-8");

    // #### 기준으로 자르기
    const sections = content
      .split(/\n(?=####\s)/g)
      .map((s) => s.trim())
      .filter(Boolean);

    allSections.push(...sections);
  }

  return allSections;
}

export function searchDocuments(query: string) {
  const sections = readMarkdownFiles();

  const q = normalize(query);

  const words = q
    .split(" ")
    .filter((w) => w.length >= 2);

  const scored = sections.map((section) => {
    const text = normalize(section);

    const title =
      normalize(section.split("\n")[0] || "");

    let score = 0;

    // 제목 완전 일치
    if (title.includes(q)) score += 200;

    // 내용 일치
    if (text.includes(q)) score += 80;

    for (const word of words) {
      if (title.includes(word)) score += 40;
      if (text.includes(word)) score += 10;
    }

    return {
      text: section,
      score,
    };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.text);
}