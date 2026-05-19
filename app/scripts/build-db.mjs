import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const OUT_FILE = path.join(DATA_DIR, "db.json");

function readMdFiles() {
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => ({
      file,
      text: fs.readFileSync(path.join(DATA_DIR, file), "utf-8"),
    }));
}

function clean(s) {
  return (s || "").replace(/\r/g, "").trim();
}

function normalize(s) {
  return clean(s).replace(/\s+/g, "").toLowerCase();
}

function splitHeadings(text) {
  const lines = text.split("\n");
  const sections = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,5})\s+(.+)$/);
    if (!m) continue;

    const level = m[1].length;
    const title = clean(m[2]);

    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      const n = lines[j].match(/^(#{1,5})\s+(.+)$/);
      if (n && n[1].length <= level) {
        end = j;
        break;
      }
    }

    sections.push({
      level,
      title,
      body: lines.slice(i, end).join("\n").trim(),
    });
  }

  return sections;
}

function splitBoldBlocks(text) {
  return text
    .split(/\n(?=\*\*[^*\n]+\*\*)/g)
    .map((block) => {
      const m = block.match(/^\*\*([^*\n]+)\*\*/);
      if (!m) return null;
      return {
        title: clean(m[1]),
        body: clean(block),
      };
    })
    .filter(Boolean);
}

function field(body, name) {
  const re = new RegExp(`-\\s*${name}\\s*:\\s*(.+)`);
  const m = body.match(re);
  return m ? clean(m[1]) : "";
}

function bulletsAfter(body, heading) {
  const idx = body.indexOf(heading);
  if (idx === -1) return [];

  const part = body.slice(idx);
  const next = part.search(/\n\*\*|\n#{1,5}\s+/);
  const target = next > 0 ? part.slice(0, next) : part;

  return target
    .split("\n")
    .filter((l) => l.trim().startsWith("-"))
    .map((l) => clean(l.replace(/^-/, "")))
    .filter(Boolean);
}

function plainAfterHeading(body, heading) {
  const idx = body.indexOf(heading);
  if (idx === -1) return "";

  const part = body.slice(idx + heading.length);
  const next = part.search(/\n\*\*|\n#{1,5}\s+/);
  return clean((next > 0 ? part.slice(0, next) : part).replace(/^[:\s]+/, ""));
}

function parseMarkdownTableSubjects(body) {
  const subjects = [];
  const lines = body.split("\n");

  for (const line of lines) {
    if (!line.includes("|")) continue;
    if (line.includes("---")) continue;

    const cells = line
      .split("|")
      .map((c) => clean(c))
      .filter(Boolean);

    for (const cell of cells.slice(1)) {
      const parts = cell
        .split(/,|·|\/|、/)
        .map((x) => clean(x))
        .filter(Boolean);

      subjects.push(...parts);
    }
  }

  return subjects;
}

function parseSubjects(files) {
  const subjects = {};

  for (const { file, text } of files) {
    if (!file.includes("교과") && !file.includes("선택과목") && !file.includes("subject")) {
      continue;
    }

    const blocks = splitBoldBlocks(text);

    for (const b of blocks) {
      const name = b.title;

      if (
        name.length > 30 ||
        name.includes(":") ||
        name.includes("관련") ||
        name.includes("추천") ||
        name.includes("핵심")
      ) {
        continue;
      }

      subjects[name] = {
        name,
        sourceFile: file,
        selectionType: field(b.body, "선택 구분"),
        credits: field(b.body, "단위수\\(학점\\)") || field(b.body, "단위수"),
        achievement: field(b.body, "성취도 / 등급"),
        description: field(b.body, "과목 소개"),
        keyIdeas: field(b.body, "핵심 아이디어"),
        relatedMajors: field(b.body, "관련 학과"),
        relatedJobs: field(b.body, "관련 직업"),
        recommendedFor: field(b.body, "이런 학생에게 추천"),
        raw: b.body,
      };
    }
  }

  return subjects;
}

function extractMajorTitle(title) {
  const t = clean(title);
  if (
    /(학과|학부|전공|교육과|의예과|약학과|간호학과|치의학과|한의학과|수의학과)$/.test(t)
  ) {
    return t;
  }
  return "";
}

function extractJobs(body) {
  const lines = body.split("\n");
  const jobs = [];

  let active = false;
  for (const line of lines) {
    if (line.includes("졸업 후 진로") || line.includes("관련 직업")) {
      active = true;
      continue;
    }

    if (active && /^#{1,5}\s+/.test(line)) break;
    if (active && line.startsWith("**") && !line.includes("졸업 후 진로") && !line.includes("관련 직업")) break;

    if (active && line.trim().startsWith("-")) {
      jobs.push(clean(line.replace(/^-/, "")));
    }
  }

  return jobs;
}

function extractRecommendedSubjects(body, subjectNames) {
  const found = new Set();

  for (const s of subjectNames) {
    if (body.includes(s)) found.add(s);
  }

  for (const s of parseMarkdownTableSubjects(body)) {
    if (subjectNames.includes(s)) found.add(s);
  }

  return Array.from(found);
}

function firstParagraph(body) {
  const lines = body
    .split("\n")
    .map((l) => clean(l))
    .filter(Boolean)
    .filter((l) => !l.startsWith("#"))
    .filter((l) => !l.startsWith("|"))
    .filter((l) => !l.startsWith("-"))
    .filter((l) => !l.startsWith("**"));

  return lines[0] || "";
}

function parseMajors(files, subjectNames) {
  const majors = {};

  for (const { file, text } of files) {
    if (!file.includes("학과안내") && !file.includes("계열")) continue;

    const sections = splitHeadings(text);

    for (const sec of sections) {
      const majorName = extractMajorTitle(sec.title);
      if (!majorName) continue;

      const recommendedSubjects = extractRecommendedSubjects(sec.body, subjectNames);

      majors[majorName] = {
        name: majorName,
        sourceFile: file,
        description: firstParagraph(sec.body),
        recommendedFor:
          plainAfterHeading(sec.body, "**이런 학생에게 권한다**") ||
          plainAfterHeading(sec.body, "**이런 학생에게 추천**"),
        jobs: extractJobs(sec.body),
        recommendedSubjects,
        raw: sec.body,
      };
    }
  }

  return majors;
}

const files = readMdFiles();
const subjects = parseSubjects(files);
const subjectNames = Object.keys(subjects);
const majors = parseMajors(files, subjectNames);

const db = {
  createdAt: new Date().toISOString(),
  subjectCount: Object.keys(subjects).length,
  majorCount: Object.keys(majors).length,
  subjects,
  majors,
};

fs.writeFileSync(OUT_FILE, JSON.stringify(db, null, 2), "utf-8");

console.log("DB 생성 완료");
console.log("과목 수:", db.subjectCount);
console.log("학과 수:", db.majorCount);
console.log("저장 위치:", OUT_FILE);