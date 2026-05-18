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
  level: number;
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

function readFiles() {
  if (!fs.existsSync(DATA_DIR)) return [];

  return fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => ({
      file,
      content: fs.readFileSync(path.join(DATA_DIR, file), "utf-8"),
    }));
}

function splitHeadingSections(file: string, content: string): Section[] {
  const lines = content.split(/\r?\n/);
  const sections: Section[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,4})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const title = match[2].trim();

    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].match(/^(#{1,4})\s+(.+)$/);
      if (next && next[1].length <= level) {
        end = j;
        break;
      }
    }

    const text = lines.slice(i, end).join("\n").trim();

    if (text.length > 30) {
      sections.push({ file, level, title, text });
    }
  }

  return sections;
}

function splitBoldSubjectSections(file: string, content: string): Section[] {
  const parts = content
    .split(/\n(?=\*\*[^*\n]+\*\*)/g)
    .map((x) => x.trim())
    .filter((x) => x.length > 30);

  return parts
    .map((text) => {
      const first = text.split("\n")[0] || "";
      const match = first.match(/^\*\*([^*\n]+)\*\*/);
      if (!match) return null;

      return {
        file,
        level: 5,
        title: match[1].trim(),
        text,
      };
    })
    .filter(Boolean) as Section[];
}

function getAllSections() {
  const files = readFiles();
  const sections: Section[] = [];

  for (const f of files) {
    sections.push(...splitHeadingSections(f.file, f.content));
    sections.push(...splitBoldSubjectSections(f.file, f.content));
  }

  return sections;
}

function isSubjectFile(file: string) {
  return (
    file.includes("교과") ||
    file.includes("선택과목") ||
    file.includes("subject") ||
    file.includes("subjects")
  );
}

function isMajorFile(file: string) {
  return file.includes("학과안내") || file.includes("계열_학과");
}

function extractTargetNames(query: string) {
  const cleaned = query.replace(/[?!.]/g, " ");
  const raw = cleaned.split(/\s+/).filter(Boolean);

  const targets = raw.filter((word) =>
    /(학과|학부|전공|계열|교육과|공학과|의예과|약학과|간호학과)$/.test(word)
  );

  return Array.from(new Set(targets));
}

function findMajorSection(query: string, sections: Section[]) {
  const targets = extractTargetNames(query);
  const majorSections = sections.filter((s) => isMajorFile(s.file));

  for (const target of targets) {
    const nt = normalize(target);

    const exact = majorSections.find((s) => normalize(s.title) === nt);
    if (exact) return exact;

    const includes = majorSections.find((s) => normalize(s.title).includes(nt));
    if (includes) return includes;
  }

  return null;
}

function findSubjectSection(query: string, sections: Section[]) {
  const subjectSections = sections.filter((s) => isSubjectFile(s.file));
  const q = normalize(query);

  const exact = subjectSections.find((s) => q.includes(normalize(s.title)));
  if (exact) return exact;

  return null;
}

function getSubjectNames(sections: Section[]) {
  return sections
    .filter((s)