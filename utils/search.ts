import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

type Section = {
  file: string;
  title: string;
  text: string;
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?!.]/g, " ")
    .trim();
}

function readMarkdownFiles() {
  if (!fs.existsSync(DATA_DIR)) return [];

  return fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const filePath = path.join(DATA_DIR, file);
      const content = fs.readFileSync(filePath, "utf-8");
      return { file, content };
    });
}

function splitIntoSections(file: string, content: string): Section[] {
  const rawSections = content
    .split(/\n(?=#{1,4}\s)/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 30);

  return rawSections.map((section) => {
    const firstLine = section.split("\n")[0] || "";
    const title = firstLine.replace(/^#{1,4}\s*/, "").trim();

    return {
      file,
      title,
      text: section,
    };
  });
}

function getAllSections() {
  const docs = readMarkdownFiles();
  const sections: Section[] = [];

  for (const doc of docs) {
    sections.push(...splitIntoSections(doc.file, doc.content));
  }

  return sections;
}

function getSubjectSections() {
  return getAllSections().filter((section) => {
    const file = section.file;
    return (
      file.includes("교과") ||
      file.includes("선택과목") ||
      file.includes("subject") ||
      file.includes("subjects")
    );
  });
}

function getMajorSections() {
  return getAllSections().filter((section) => {
    const file = section.file;
    return file.includes("학과안내") || file.includes("major");
  });
}

function extractPossibleKeywords(query: string) {
  return query
    .replace(/[?!.]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
}

function scoreSection(section: Section, query: string) {
  const q = normalize(query);
  const words = extractPossibleKeywords(query).map(normalize);

  const title = normalize(section.title);
  const text = normalize(section.text);
  const file = normalize(section.file);

  let score = 0;

  if (title === q) score += 1000;
  if (title.includes(q)) score += 700;
  if (text.includes(q)) score += 300;
  if (file.includes(q)) score += 100;

  for (const word of words) {
    if (title.includes(word)) score += 120;
    if (file.includes(word)) score += 50;
    if (text.includes(word)) score += 20;
  }

  return score;
}

export function searchSections(query: string, limit = 8) {
  const sections = getAllSections();

  return sections
    .map((section) => ({
      ...section,
      score: scoreSection(section, query),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function findExactMajorSection(query: string) {
  const sections = getMajorSections();
  const normalizedQuery = normalize(query);

  const candidates = sections
    .map((section) => {
      const title = normalize(section.title);
      const text = normalize(section.text);

      let score = 0;

      if (normalizedQuery.includes(title) && title.length >= 3) score += 1000;
      if (title && normalizedQuery.includes(title.replace("학과", ""))) score += 700;
      if (title.includes(normalizedQuery)) score += 500;
      if (text.includes(normalizedQuery)) score += 250;

      for (const word of extractPossibleKeywords(query)) {
        const w = normalize(word);
        if (title.includes(w)) score += 200;
        if (text.includes(w)) score += 30;
      }

      return { ...section, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0] || null;
}

export function findExactSubjectSection(query: string) {
  const sections = getSubjectSections();
  const normalizedQuery = normalize(query);

  const candidates = sections
    .map((section) => {
      const title = normalize(section.title);
      const text = normalize(section.text);

      let score = 0;

      if (normalizedQuery.includes(title) && title.length >= 2) score += 1000;
      if (title.includes(normalizedQuery)) score += 700;
      if (text.includes(normalizedQuery)) score += 250;

      for (const word of extractPossibleKeywords(query)) {
        const w = normalize(word);
        if (title.includes(w)) score += 200;
        if (text.includes(w)) score += 30;
      }

      return { ...section, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0] || null;
}

export function extractSubjectsFromText(text: string) {
  const subjectSections = getSubjectSections();
  const subjectNames = subjectSections
    .map((s) => s.title)
    .filter((title) => title.length >= 2 && title.length <= 30);

  const found = subjectNames.filter((subject) => text.includes(subject));

  return Array.from(new Set(found)).slice(0, 12);
}

export function findSubjectSectionsByNames(subjectNames: string[]) {
  const subjectSections = getSubjectSections();

  return subjectNames
    .map((subject) => {
      const found = subjectSections.find((section) => section.title === subject);
      return found || null;
    })
    .filter(Boolean) as Section[];
}

export function buildContext(query: string) {
  const exactMajor = findExactMajorSection(query);
  const exactSubject = findExactSubjectSection(query);

  const contextParts: string[] = [];

  if (exactMajor) {
    contextParts.push(
      `[학과 상세 안내]\n파일: ${exactMajor.file}\n제목: ${exactMajor.title}\n\n${exactMajor.text}`
    );

    const subjects = extractSubjectsFromText(exactMajor.text);
    const subjectDetails = findSubjectSectionsByNames(subjects);

    for (const subject of subjectDetails.slice(0, 8)) {
      contextParts.push(
        `[관련 과목 정보]\n파일: ${subject.file}\n제목: ${subject.title}\n\n${subject.text}`
      );
    }
  }

  if (exactSubject) {
    contextParts.push(
      `[과목 상세 정보]\n파일: ${exactSubject.file}\n제목: ${exactSubject.title}\n\n${exactSubject.text}`
    );
  }

  const related = searchSections(query, 6);

  for (const section of related) {
    const alreadyIncluded = contextParts.some((part) =>
      part.includes(`제목: ${section.title}`)
    );

    if (!alreadyIncluded) {
      contextParts.push(
        `[관련 참고 자료]\n파일: ${section.file}\n제목: ${section.title}\n\n${section.text}`
      );
    }
  }

  const finalContext = contextParts
    .join("\n\n---\n\n")
    .slice(0, 45000);

  console.log("질문:", query);
  console.log("학과 섹션:", exactMajor?.title || "없음");
  console.log("과목 섹션:", exactSubject?.title || "없음");
  console.log("context length:", finalContext.length);

  return {
    context: finalContext,
    hasMajor: Boolean(exactMajor),
    hasSubject: Boolean(exactSubject),
  };
}