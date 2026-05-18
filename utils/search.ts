import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

type SearchResult = {
  file: string;
  text: string;
  score: number;
};

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
    extra.push(
      "간호학과",
      "의약보건계열",
      "생명과학",
      "화학",
      "세포와 물질대사",
      "생물의 유전",
      "물질과 에너지"
    );
  }

  if (query.includes("컴퓨터") || query.includes("컴공") || query.includes("소프트웨어")) {
    extra.push(
      "컴퓨터공학과",
      "공학계열",
      "프로그래밍",
      "데이터 과학",
      "인공지능 기초",
      "인공지능 수학"
    );
  }

  if (query.includes("경영") || query.includes("경제")) {
    extra.push(
      "경영학과",
      "사회과학계열",
      "경제",
      "금융과 경제생활",
      "사회와 문화",
      "확률과 통계"
    );
  }

  if (query.includes("디자인") || query.includes("미술") || query.includes("예술")) {
    extra.push(
      "예술체육계열",
      "미술 창작",
      "미술 감상과 비평",
      "미술과 매체",
      "조형"
    );
  }

  return `${query} ${extra.join(" ")}`;
}

function readMarkdownFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    console.log("data 폴더 없음:", DATA_DIR);
    return [];
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".md"));

  console.log("읽은 md 파일:", files);

  return files.map((file) => {
    const filePath = path.join(DATA_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");

    return {
      file,
      text: content,
    };
  });
}

export function searchDocuments(query: string) {
  const docs = readMarkdownFiles();

  const original = normalize(query);
  const expanded = normalize(expandQuery(query));
  const words = expanded.split(" ").filter((w) => w.length >= 2);

  const scored: SearchResult[] = docs.map((doc) => {
    const text = normalize(doc.text);
    const fileName = normalize(doc.file);

    let score = 0;

    if (fileName.includes(original)) score += 300;
    if (text.includes(original)) score += 250;

    for (const word of words) {
      if (fileName.includes(word)) score += 80;
      if (text.includes(word)) score += 20;
    }

    if (text.includes("관련 학과")) score += 20;
    if (text.includes("관련 직업")) score += 20;
    if (text.includes("추천 선택과목")) score += 20;
    if (text.includes("단위수") || text.includes("학점")) score += 15;
    if (text.includes("선택 구분")) score += 15;

    return {
      file: doc.file,
      text: `파일명: ${doc.file}\n\n${doc.text}`,
      score,
    };
  });

  const results = scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  console.log(
    "검색 결과:",
    results.map((r) => ({
      file: r.file,
      score: r.score,
      preview: r.text.slice(0, 120),
    }))
  );

  return results.map((r) => r.text);
}