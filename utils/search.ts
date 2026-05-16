import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function expandQuery(query: string) {
  const extra: string[] = [];

  if (query.includes("간호")) {
    extra.push(
      "간호학과",
      "간호",
      "생명과학",
      "화학",
      "세포와 물질대사",
      "생물의 유전",
      "물질과 에너지",
      "화학 반응의 세계"
    );
  }

  if (query.includes("의대") || query.includes("의예") || query.includes("의학")) {
    extra.push(
      "의학부",
      "의예과",
      "생명과학",
      "화학",
      "세포와 물질대사",
      "생물의 유전",
      "물질과 에너지",
      "화학 반응의 세계"
    );
  }

  if (query.includes("컴퓨터") || query.includes("컴공") || query.includes("소프트웨어") || query.includes("인공지능")) {
    extra.push(
      "컴퓨터공학과",
      "소프트웨어학부",
      "AI학과",
      "프로그래밍",
      "데이터 과학",
      "인공지능 기초",
      "인공지능 수학",
      "미적분Ⅱ",
      "기하"
    );
  }

  if (query.includes("경영") || query.includes("경제")) {
    extra.push(
      "경영학과",
      "경제학과",
      "경영·경제 계열",
      "경제",
      "금융과 경제생활",
      "사회와 문화",
      "확률과 통계",
      "대수"
    );
  }

  if (query.includes("디자인") || query.includes("미술") || query.includes("뷰티") || query.includes("메이크업") || query.includes("헤어")) {
    extra.push(
      "미술 창작",
      "미술 감상과 비평",
      "미술과 매체",
      "조형",
      "생활과학 탐구"
    );
  }

  return `${query} ${extra.join(" ")}`;
}

function readMarkdownFiles() {
  if (!fs.existsSync(DATA_DIR)) return [];

  const files = fs.readdirSync(DATA_DIR).filter((file) => file.endsWith(".md"));

  const sections: string[] = [];

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

  const expandedQuery = expandQuery(query);
  const q = normalize(expandedQuery);
  const originalQ = normalize(query);

  const words = q.split(" ").filter((w) => w.length >= 2);

  const scored = sections.map((section) => {
    const text = normalize(section);
    const firstLine = normalize(section.split("\n")[0] || "");

    let score = 0;

    if (firstLine.includes(originalQ)) score += 400;
    if (text.includes(originalQ)) score += 180;

    if (firstLine.includes(q)) score += 200;
    if (text.includes(q)) score += 80;

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
    .slice(0, 8)
    .map((x) => x.text);
}