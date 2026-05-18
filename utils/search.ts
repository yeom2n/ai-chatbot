import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

type Section = {
  file: string;
  title: string;
  text: string;
};

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").replace(/[?!.]/g, " ").trim();
}

function readSections(): Section[] {
  if (!fs.existsSync(DATA_DIR)) return [];

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".md"));
  const sections: Section[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");

    const parts = content
      .split(/\n(?=#{1,4}\s)/g)
      .map((x) => x.trim())
      .filter((x) => x.length > 30);

    for (const part of parts) {
      const first = part.split("\n")[0] || "";
      const title = first.replace(/^#{1,4}\s*/, "").trim();

      sections.push({ file, title, text: part });
    }
  }

  return sections;
}

function isSubjectFile(file: string) {
  return file.includes("교과") || file.includes("선택과목") || file.includes("subject");
}

function isMajorFile(file: string) {
  return file.includes("학과안내") || file.includes("계열");
}

function findMajorSection(query: string, sections: Section[]) {
  const q = normalize(query);

  const majorSections = sections.filter((s) => isMajorFile(s.file));

  const exact = majorSections.find((s) => {
    const title = normalize(s.title);
    return title.length >= 3 && q.includes(title);
  });

  if (exact) return exact;

  return majorSections
    .map((s) => {
      const title = normalize(s.title);
      let score = 0;

      if (title.includes("학과") && q.includes(title.replace("학과", ""))) score += 500;
      if (normalize(s.text).includes(q)) score += 200;

      return { ...s, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)[0] || null;
}

function findSubjectSection(query: string, sections: Section[]) {
  const q = normalize(query);
  const subjectSections = sections.filter((s) => isSubjectFile(s.file));

  return subjectSections.find((s) => {
    const title = normalize(s.title);
    return title.length >= 2 && q.includes(title);
  }) || null;
}

function extractSubjectSectionsFromText(text: string, sections: Section[]) {
  const subjectSections = sections.filter((s) => isSubjectFile(s.file));

  return subjectSections.filter((s) => {
    if (s.title.length < 2) return false;
    return text.includes(s.title);
  });
}

function searchGeneral(query: string, sections: Section[], limit = 6) {
  const words = normalize(query).split(" ").filter((w) => w.length >= 2);

  return sections
    .map((s) => {
      const text = normalize(s.text);
      const title = normalize(s.title);
      let score = 0;

      for (const w of words) {
        if (title.includes(w)) score += 80;
        if (text.includes(w)) score += 15;
      }

      return { ...s, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buildContext(query: string) {
  const sections = readSections();

  const major = findMajorSection(query, sections);
  const subject = findSubjectSection(query, sections);

  const parts: string[] = [];

  // 1순위: 학과 섹션
  if (major) {
    parts.push(`[학과 상세 안내]\n파일: ${major.file}\n제목: ${major.title}\n\n${major.text}`);

    // 학과 섹션에 실제로 등장한 과목만 추가
    const relatedSubjects = extractSubjectSectionsFromText(major.text, sections);

    for (const s of relatedSubjects.slice(0, 10)) {
      parts.push(`[관련 과목 정보]\n파일: ${s.file}\n제목: ${s.title}\n\n${s.text}`);
    }

    console.log("학과 섹션:", major.title);
    console.log("추출 과목:", relatedSubjects.map((s) => s.title));

    return {
      context: parts.join("\n\n---\n\n").slice(0, 35000),
      hasMajor: true,
      hasSubject: Boolean(subject),
    };
  }

  // 2순위: 과목 섹션
  if (subject) {
    parts.push(`[과목 상세 정보]\n파일: ${subject.file}\n제목: ${subject.title}\n\n${subject.text}`);

    return {
      context: parts.join("\n\n---\n\n").slice(0, 25000),
      hasMajor: false,
      hasSubject: true,
    };
  }

  // 3순위: 일반 검색
  const general = searchGeneral(query, sections, 6);
  for (const s of general) {
    parts.push(`[관련 참고 자료]\n파일: ${s.file}\n제목: ${s.title}\n\n${s.text}`);
  }

  return {
    context: parts.join("\n\n---\n\n").slice(0, 30000),
    hasMajor: false,
    hasSubject: false,
  };
}