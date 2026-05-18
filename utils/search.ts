import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?!.]/g, " ")
    .trim();
}

function expandQuery(query: string) {
  const extra: string[] = [];

  if (query.includes("간호")) {
    extra.push("간호학과", "의약보건계열", "생명과학", "화학", "세포와 물질대사", "생물의 유전");
  }

  if (query.includes("의대") || query.includes("의예") || query.includes("의학")) {
    extra.push("의약보건계열", "생명과학", "화학", "세포와 물질대사", "생물의 유전");
  }

  if (query.includes("컴퓨터") || query.includes("컴공") || query.includes("소프트웨어") || query.includes("인공지능")) {
    extra.push("공학계열", "컴퓨터공학과", "프로그래밍", "데이터 과학", "인공지능 수학");
  }

  if (query.includes("경영") || query.includes("경제")) {
    extra.push("사회과학계열", "경영학과", "경제", "금융과 경제생활", "사회와 문화", "확률과 통계");
  }

  if (query.includes("디자인") || query.includes("미술") || query.includes("예술") || query.includes("체육")) {
    extra.push("예술체육계열", "미술 창작", "미술 감상과 비평", "미술과 매체", "조형");
  }

  if (query.includes("교육") || query.includes("교사") || query.includes("사범")) {
    extra.push("교육계열", "교육학과", "윤리", "사회와 문화");
  }

  return `${query} ${extra.join(" ")}`;
}

function readAllMarkdownSections() {
  if (!fs.existsSync(DATA_DIR)) return [];

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".md"));

  const sections: { file: string; text: string }[] = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");

    const chunks = content
      .split(/\n(?=#{1,4}\s|\*\*[^*\n]+\*\*)/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 40);

    for (const chunk of chunks) {
      sections.push({
        file,
        text: `파일: ${file}\n\n${chunk}`,
      });
    }
  }

  return sections;
}

export function searchDocuments(query: string) {
  const sections = readAllMarkdownSections();

  const expanded = normalize(expandQuery(query));
  const original = normalize(query);
  const words = expanded.split(" ").filter((w) => w.length >= 2);

  const scored = sections.map((section) => {
    const text = normalize(section.text);
    const firstLine = normalize(section.text.split("\n")[0] || "");
    const fileName = normalize(section.file);

    let score = 0;

    if (firstLine.includes(original)) score += 500;
    if (text.includes(original)) score += 220;
    if (fileName.includes(original)) score += 120;

    for (const word of words) {
      if (firstLine.includes(word)) score += 80;
      if (fileName.includes(word)) score += 50;
      if (text.includes(word)) score += 18;
    }

    if (text.includes("관련 학과")) score += 35;
    if (text.includes("관련 직업")) score += 35;
    if (text.includes("추천 선택과목")) score += 35;
    if (text.includes("학과 관련 고등학교 선택과목")) score += 45;
    if (text.includes("선택 구분")) score += 25;
    if (text.includes("단위수") || text.includes("학점")) score += 25;
    if (text.includes("이런 학생에게 권한다")) score += 25;
    if (text.includes("이런 학생에게 추천")) score += 25;

    return {
      text: section.text,
      score,
    };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((x) => x.text);
}