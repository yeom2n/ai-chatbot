import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export type SearchBuildResult = {
  context: string;
  mode: "major" | "subject" | "general" | "none";
  foundTitle?: string;
};

type Section = {
  file: string;
  title: string;
  text: string;
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[?!.]/g, "")
    .replace(/[·ㆍ]/g, "")
    .trim();
}

function readSections(): Section[] {
  if (!fs.existsSync(DATA_DIR)) return [];

  const files = fs.readdirSync(DATA_DIR).filter((file) => file.endsWith(".md"));
  const sections: Section[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
      if (!match) continue;

      const level = match[1].length;
      const title = match[2].trim();

      let end = lines.length;

      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].match(/^(#{1,6})\s+(.+)$/);
        if (next && next[1].length <= level) {
          end = j;
          break;
        }
      }

      const text = lines.slice(i, end).join("\n").trim();

      if (text.length > 20) {
        sections.push({
          file,
          title,
          text,
        });
      }
    }
  }

  return sections;
}

function isMajorFile(file: string) {
  return (
    file.includes("학과안내") ||
    file.includes("계열") ||
    file.includes("major")
  );
}

function isSubjectFile(file: string) {
  return (
    file.includes("교과") ||
    file.includes("선택과목") ||
    file.includes("subject") ||
    file.includes("subjects")
  );
}

function makeTitleAliases(title: string) {
  const aliases = new Set<string>();

  aliases.add(title);
  aliases.add(title.replace(/학과/g, ""));
  aliases.add(title.replace(/학부/g, ""));
  aliases.add(title.replace(/전공/g, ""));
  aliases.add(title.replace(/계열/g, ""));
  aliases.add(title.replace(/교육과/g, "교육"));
  aliases.add(title.replace(/디자인학과/g, "디자인"));
  aliases.add(title.replace(/시각디자인학과/g, "디자인"));
  aliases.add(title.replace(/산업디자인학과/g, "디자인"));

  return Array.from(aliases)
    .map((x) => normalize(x))
    .filter((x) => x.length >= 2);
}

function findMajor(query: string, sections: Section[]) {
  const q = normalize(query);

  const majorSections = sections.filter((section) => isMajorFile(section.file));

  const exact = majorSections.find((section) => {
    const aliases = makeTitleAliases(section.title);
    return aliases.some((alias) => q.includes(alias));
  });

  if (exact) return exact;

  const scored = majorSections
    .map((section) => {
      const title = normalize(section.title);
      const file = normalize(section.file);
      const text = normalize(section.text);

      let score = 0;

      if (q.includes(title)) score += 500;
      if (title.includes(q)) score += 400;
      if (file.includes(q)) score += 300;
      if (text.includes(q)) score += 150;

      const qWords = query
        .replace(/[?!.]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 2);

      for (const word of qWords) {
        const w = normalize(word);
        if (!w) continue;

        if (title.includes(w)) score += 120;
        if (file.includes(w)) score += 80;
        if (text.includes(w)) score += 25;
      }

      return { ...section, score };
    })
    .filter((section) => section.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0] || null;
}

function findSubject(query: string, sections: Section[]) {
  const q = normalize(query);

  const subjectSections = sections.filter((section) =>
    isSubjectFile(section.file)
  );

  const exact = subjectSections.find((section) => {
    const title = normalize(section.title);
    return title.length >= 2 && q.includes(title);
  });

  if (exact) return exact;

  return null;
}

function extractSubjectsFromText(text: string, sections: Section[]) {
  const subjectSections = sections.filter((section) =>
    isSubjectFile(section.file)
  );

  const found = subjectSections.filter((section) => {
    const subjectName = section.title.trim();

    if (subjectName.length < 2 || subjectName.length > 30) return false;

    return text.includes(subjectName);
  });

  const unique = new Map<string, Section>();

  for (const section of found) {
    unique.set(section.title, section);
  }

  return Array.from(unique.values()).slice(0, 12);
}

function generalSearch(query: string, sections: Section[]) {
  const words = query
    .replace(/[?!.]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);

  return sections
    .map((section) => {
      let score = 0;

      for (const word of words) {
        if (section.title.includes(word)) score += 100;
        if (section.text.includes(word)) score += 20;
        if (section.file.includes(word)) score += 30;
      }

      return {
        ...section,
        score,
      };
    })
    .filter((section) => section.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function buildContext(query: string): SearchBuildResult {
  const sections = readSections();

  const major = findMajor(query, sections);
  const subject = findSubject(query, sections);

  const parts: string[] = [];

  if (major) {
    parts.push(
      `[학과/계열 상세 안내]\n파일: ${major.file}\n제목: ${major.title}\n\n${major.text}`
    );

    const relatedSubjects = extractSubjectsFromText(major.text, sections);

    for (const related of relatedSubjects) {
      parts.push(
        `[관련 과목 정보]\n파일: ${related.file}\n제목: ${related.title}\n\n${related.text}`
      );
    }

    console.log("검색 모드: major");
    console.log("찾은 제목:", major.title);
    console.log("찾은 파일:", major.file);
    console.log("추출 과목:", relatedSubjects.map((s) => s.title));

    return {
      mode: "major",
      foundTitle: major.title,
      context: parts.join("\n\n---\n\n").slice(0, 35000),
    };
  }

  if (subject) {
    parts.push(
      `[과목 상세 정보]\n파일: ${subject.file}\n제목: ${subject.title}\n\n${subject.text}`
    );

    console.log("검색 모드: subject");
    console.log("찾은 제목:", subject.title);

    return {
      mode: "subject",
      foundTitle: subject.title,
      context: parts.join("\n\n---\n\n").slice(0, 25000),
    };
  }

  const general = generalSearch(query, sections);

  for (const item of general) {
    parts.push(
      `[관련 참고 자료]\n파일: ${item.file}\n제목: ${item.title}\n\n${item.text}`
    );
  }

  console.log("검색 모드:", general.length > 0 ? "general" : "none");
  console.log("검색 결과:", general.map((item) => `${item.file} / ${item.title}`));

  return {
    mode: general.length > 0 ? "general" : "none",
    foundTitle: general[0]?.title,
    context: parts.join("\n\n---\n\n").slice(0, 30000),
  };
}