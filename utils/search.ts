import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function readMarkdownFiles() {
  const files = fs.readdirSync(DATA_DIR).filter((file) => file.endsWith(".md"));

  let sections: string[] = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");

    const fileSections = content
      .split(/\n(?=####\s|\*\*[^*\n]+\*\*)/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 30);

    sections.push(...fileSections);
  }

  return sections;
}

export function searchDocuments(query: string) {
  const sections = readMarkdownFiles();
  const q = normalize(query);
  const words = q.split(" ").filter((w) => w.length >= 2);

  const scored = sections.map((section) => {
    const text = normalize(section);
    const firstLine = normalize(section.split("\n")[0] || "");

    let score = 0;

    if (firstLine.includes(q)) score += 300;
    if (text.includes(q)) score += 120;

    for (const word of words) {
      if (firstLine.includes(word)) score += 70;
      if (text.includes(word)) score += 15;
    }

    if (text.includes("선택 구분")) score += 40;
    if (text.includes("단위수") || text.includes("학점")) score += 40;
    if (text.includes("성취도")) score += 30;
    if (text.includes("과목 소개")) score += 40;
    if (text.includes("핵심 아이디어")) score += 30;
    if (text.includes("이런 학생에게 추천")) score += 40;
    if (text.includes("관련 학과")) score += 35;
    if (text.includes("관련 직업")) score += 35;

    return { text: section, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.text);
}