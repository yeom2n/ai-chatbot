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
    file.includes("subject")
  );
}

function extractKeywords(query: string) {
  const words = query
    .replace(/[?!.]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);

  const keywords = {
    universities: [] as string[],
    majors: [] as string[],
    tracks: [] as string[],
  };

  for (const word of words) {
    if (
      word.includes("대") ||
      word.includes("대학교")
    ) {
      keywords.universities.push(word);
    }

    if (
      word.includes("학과") ||
      word.includes("학부") ||
      word.includes("전공")
    ) {
      keywords.majors.push(word);
    }

    if (
      word.includes("계열")
    ) {
      keywords.tracks.push(word);
    }
  }

  return keywords;
}

function findMajor(query: string, sections: Section[]) {
  const keywords = extractKeywords(query);

  const majorSections = sections.filter((s) =>
    isMajorFile(s.file)
  );

  // 1순위: 학과
  for (const major of keywords.majors) {
    const n = normalize(major);

    const found = majorSections.find((s) => {
      const title = normalize(s.title);

      return (
        title.includes(n) ||
        n.includes(title)
      );
    });

    if (found) return found;
  }

  // 2순위: 계열
  for (const track of keywords.tracks) {
    const n = normalize(track);

    const found = majorSections.find((s) => {
      const title = normalize(s.title);

      return (
        title.includes(n) ||
        n.includes(title)
      );
    });

    if (found) return found;
  }

  return null;
}

function findSubject(query: string, sections: Section[]) {
  const q = normalize(query);

  const subjectSections = sections.filter((s) =>
    isSubjectFile(s.file)
  );

  return (
    subjectSections.find((s) => {
      const title = normalize(s.title);
      return q.includes(title);
    }) || null
  );
}

function extractSubjects(text: string, sections: Section[]) {
  const subjectSections = sections.filter((s) =>
    isSubjectFile(s.file)
  );

  const found = subjectSections.filter((s) => {
    const title = s.title.trim();

    if (title.length < 2 || title.length > 30) return false;

    return text.includes(title);
  });

  const unique = new Map<string, Section>();

  for (const s of found) {
    unique.set(s.title, s);
  }

  return Array.from(unique.values()).slice(0, 12);
}

function generalSearch(query: string, sections: Section[]) {
  const words = query
    .replace(/[?!.]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);

  return sections
    .map((s) => {
      let score = 0;

      for (const word of words) {
        if (s.title.includes(word)) score += 100;
        if (s.text.includes(word)) score += 20;
        if (s.file.includes(word)) score += 30;
      }

      return {
        ...s,
        score,
      };
    })
    .filter((s) => s.score > 0)
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
      `[학과/계열 안내]\n파일: ${major.file}\n제목: ${major.title}\n\n${major.text}`
    );

    const relatedSubjects = extractSubjects(major.text, sections);

    for (const related of relatedSubjects) {
      parts.push(
        `[관련 과목]\n파일: ${related.file}\n제목: ${related.title}\n\n${related.text}`
      );
    }

    console.log("검색 모드: major");
    console.log("찾은 제목:", major.title);

    return {
      mode: "major",
      foundTitle: major.title,
      context: parts.join("\n\n---\n\n").slice(0, 35000),
    };
  }

  if (subject) {
    parts.push(
      `[과목 정보]\n파일: ${subject.file}\n제목: ${subject.title}\n\n${subject.text}`
    );

    return {
      mode: "subject",
      foundTitle: subject.title,
      context: parts.join("\n\n---\n\n").slice(0, 25000),
    };
  }

  const general = generalSearch(query, sections);

  for (const item of general) {
    parts.push(
      `[참고 자료]\n파일: ${item.file}\n제목: ${item.title}\n\n${item.text}`
    );
  }

  return {
    mode: general.length > 0 ? "general" : "none",
    foundTitle: general[0]?.title,
    context: parts.join("\n\n---\n\n").slice(0, 30000),
  };
}