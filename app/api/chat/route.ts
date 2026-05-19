import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type Subject = {
  name: string;
  selectionType?: string;
  credits?: string;
  achievement?: string;
  description?: string;
  keyIdeas?: string;
  relatedMajors?: string;
  relatedJobs?: string;
  recommendedFor?: string;
};

type Major = {
  name: string;
  description?: string;
  recommendedFor?: string;
  jobs?: string[];
  recommendedSubjects?: string[];
};

type DB = {
  subjects: Record<string, Subject>;
  majors: Record<string, Major>;
};

function loadDB(): DB | null {
  const filePath = path.join(process.cwd(), "data", "db.json");
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function normalize(s: string) {
  return s
    .replace(/\s+/g, "")
    .replace(/[?!.]/g, "")
    .replace(/[·ㆍ]/g, "")
    .toLowerCase();
}

function cleanQuery(query: string) {
  return query
    .replace(/[?!.]/g, " ")
    .replace(/은|는|이|가|을|를|에|에서|으로|로|와|과|랑|하고|도|만|의|에게|한테|부터|까지|처럼|보다|마다/g, " ");
}

function makeAliases(name: string, type: "major" | "subject") {
  const aliases = new Set<string>();
  aliases.add(name);

  if (type === "major") {
    aliases.add(name.replace(/학과$/g, ""));
    aliases.add(name.replace(/학부$/g, ""));
    aliases.add(name.replace(/전공$/g, ""));
    aliases.add(name.replace(/계열$/g, ""));
  }

  return Array.from(aliases)
    .map(normalize)
    .filter((x) => x.length >= 2);
}

function findBestName(query: string, names: string[], type: "major" | "subject") {
  const q = normalize(cleanQuery(query));

  const scored = names
    .map((name) => {
      const aliases = makeAliases(name, type);
      const nameNorm = normalize(name);

      let score = 0;

      for (const alias of aliases) {
        if (q === alias) score += 3000;
        if (q.includes(nameNorm)) score += 2500;

        if (type === "major") {
          if (q.includes(alias + "학과")) score += 2200;
          if (q.includes(alias + "학부")) score += 2200;
          if (q.includes(alias + "전공")) score += 2200;
          if (q.includes(alias + "계열")) score += 2200;
        }

        if (q.includes(alias)) score += 1000 + alias.length;
      }

      // 짧은 단어 때문에 스포츠경영학과가 경영학과보다 먼저 잡히는 것 방지
      if (type === "major") {
        const directMajorPattern = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
        if (directMajorPattern.test(query)) score += 5000;
      }

      return { name, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.length - b.name.length;
    });

  return scored[0]?.name || "";
}

function findMajor(query: string, db: DB) {
  return findBestName(query, Object.keys(db.majors), "major");
}

function findSubject(query: string, db: DB) {
  return findBestName(query, Object.keys(db.subjects), "subject");
}

function visible(value?: string) {
  if (!value) return false;
  const text = value.trim();
  if (!text) return false;
  if (text.includes("자료에 명시되지 않음")) return false;
  if (text === "없음") return false;
  if (text.includes("미기재")) return false;
  return true;
}

function formatSubject(s: Subject) {
  const sections: string[] = [];

  sections.push(`${s.name}은(는) 운양고 선택과목 자료에 등록된 과목입니다.`);

  if (visible(s.selectionType)) sections.push(`**선택 구분**\n- ${s.selectionType}`);
  if (visible(s.credits)) sections.push(`**단위수**\n- ${s.credits}`);
  if (visible(s.achievement)) sections.push(`**성취도 / 등급**\n- ${s.achievement}`);

  if (visible(s.description) || visible(s.keyIdeas)) {
    sections.push(
      `**과목 내용**\n${[
        visible(s.description) ? `- ${s.description}` : "",
        visible(s.keyIdeas) ? `- ${s.keyIdeas}` : "",
      ]
        .filter(Boolean)
        .join("\n")}`
    );
  }

  if (visible(s.relatedMajors)) sections.push(`**관련 학과**\n- ${s.relatedMajors}`);
  if (visible(s.relatedJobs)) sections.push(`**관련 직업**\n- ${s.relatedJobs}`);

  return sections.join("\n\n").trim();
}

function formatMajor(major: Major, db: DB) {
  const subjects = (major.recommendedSubjects || [])
    .map((name) => db.subjects[name])
    .filter(Boolean);

  const sections: string[] = [];

  sections.push(`${major.name}는 자료에 따르면 다음과 같은 내용을 중심으로 배우는 학과입니다.`);

  if (visible(major.description)) {
    sections.push(`**학과 설명**\n- ${major.description}`);
  }

  if (major.jobs && major.jobs.length > 0) {
    sections.push(`**관련 직업**\n${major.jobs.map((j) => `- ${j}`).join("\n")}`);
  }

  if (subjects.length > 0) {
    const subjectLines = subjects
      .map((s) => {
        const detail = [s.selectionType, s.credits].filter(visible).join(", ");
        const desc = visible(s.description) ? s.description : "자료에 과목 정보가 있습니다.";
        return `- **${s.name}**${detail ? ` (${detail})` : ""}: ${desc}`;
      })
      .join("\n");

    sections.push(`**추천 선택과목**\n${subjectLines}`);
  } else {
    sections.push("**추천 선택과목**\n- 학교 제공 자료에서 이 학과와 직접 연결된 추천 과목을 찾지 못했습니다.");
  }

  return sections.join("\n\n").trim();
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const db = loadDB();

    if (!db) {
      return NextResponse.json({
        reply: "data/db.json 파일이 없습니다. 먼저 `node scripts/build-db.mjs`를 실행해 주세요.",
      });
    }

    const userMessage =
      messages?.filter((m: Message) => m.role === "user").at(-1)?.content || "";

    const majorName = findMajor(userMessage, db);
    const subjectName = findSubject(userMessage, db);

    if (majorName) {
      return NextResponse.json({
        reply: formatMajor(db.majors[majorName], db),
      });
    }

    if (subjectName) {
      return NextResponse.json({
        reply: formatSubject(db.subjects[subjectName]),
      });
    }

    return NextResponse.json({
      reply: "학교 제공 자료에서 해당 학과나 과목 정보를 찾지 못했습니다. 학과명이나 과목명을 정확히 입력해 주세요.",
    });
  } catch {
    return NextResponse.json({
      reply: "서버 오류가 발생했습니다.",
    });
  }
}