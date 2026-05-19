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
};

type Major = {
  name: string;
  description?: string;
  jobs?: string[];
  recommendedSubjects?: string[];
  raw?: string;
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

function normalize(text: string) {
  return text
    .replace(/\s+/g, "")
    .replace(/[?!.]/g, "")
    .replace(/[·ㆍ]/g, "")
    .toLowerCase();
}

function cleanQuery(query: string) {
  return query.replace(
    /(은|는|이|가|을|를|에|에서|으로|로|와|과|의|도|만|야|인가|이야|니|냐|줘|알려줘)/g,
    " "
  );
}

function findExactMajor(query: string, db: DB) {
  const q = normalize(cleanQuery(query));
  const names = Object.keys(db.majors);

  const exact = names.find((name) => q.includes(normalize(name)));
  if (exact) return exact;

  const withoutSuffix = names.find((name) => {
    const base = normalize(
      name
        .replace(/학과$/g, "")
        .replace(/학부$/g, "")
        .replace(/전공$/g, "")
        .replace(/계열$/g, "")
    );

    return q === base || q.includes(base + "학과") || q.includes(base + "계열");
  });

  return withoutSuffix || "";
}

function findExactSubject(query: string, db: DB) {
  const q = normalize(cleanQuery(query));
  const names = Object.keys(db.subjects);

  const exact = names.find((name) => q.includes(normalize(name)));
  return exact || "";
}

function visible(value?: string) {
  if (!value) return false;
  const t = value.trim();
  if (!t) return false;
  if (t.includes("자료에 명시되지 않음")) return false;
  if (t === "없음") return false;
  if (t.includes("미기재")) return false;
  return true;
}

function formatSubject(subject: Subject) {
  const parts: string[] = [];

  parts.push(`${subject.name}은(는) 운양고 선택과목 자료에 등록된 과목입니다.`);

  if (visible(subject.selectionType)) {
    parts.push(`**선택 구분**\n- ${subject.selectionType}`);
  }

  if (visible(subject.credits)) {
    parts.push(`**단위수**\n- ${subject.credits}`);
  }

  if (visible(subject.achievement)) {
    parts.push(`**성취도 / 등급**\n- ${subject.achievement}`);
  }

  if (visible(subject.description) || visible(subject.keyIdeas)) {
    const lines = [
      visible(subject.description) ? `- ${subject.description}` : "",
      visible(subject.keyIdeas) ? `- ${subject.keyIdeas}` : "",
    ].filter(Boolean);

    parts.push(`**과목 내용**\n${lines.join("\n")}`);
  }

  if (visible(subject.relatedMajors)) {
    parts.push(`**관련 학과**\n- ${subject.relatedMajors}`);
  }

  if (visible(subject.relatedJobs)) {
    parts.push(`**관련 직업**\n- ${subject.relatedJobs}`);
  }

  return parts.join("\n\n");
}

function formatMajor(major: Major, db: DB) {
  const parts: string[] = [];

  parts.push(`${major.name}는 자료에 따르면 다음과 같은 내용을 중심으로 배우는 학과입니다.`);

  if (visible(major.description)) {
    parts.push(`**학과 설명**\n- ${major.description}`);
  }

  if (major.jobs && major.jobs.length > 0) {
    parts.push(`**관련 직업**\n${major.jobs.map((j) => `- ${j}`).join("\n")}`);
  }

  const subjects = (major.recommendedSubjects || [])
    .map((name) => db.subjects[name])
    .filter(Boolean);

  if (subjects.length > 0) {
    parts.push(
      `**추천 선택과목**\n${subjects
        .map((s) => {
          const detail = [s.selectionType, s.credits].filter(visible).join(", ");
          return `- **${s.name}**${detail ? ` (${detail})` : ""}${
            visible(s.description) ? `: ${s.description}` : ""
          }`;
        })
        .join("\n")}`
    );
  }

  return parts.join("\n\n");
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

    const majorName = findExactMajor(userMessage, db);
    const subjectName = findExactSubject(userMessage, db);

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
      reply:
        "학교 제공 자료에서 해당 학과나 과목 정보를 찾지 못했습니다. 학과명이나 과목명을 정확히 입력해 주세요.",
    });
  } catch {
    return NextResponse.json({
      reply: "서버 오류가 발생했습니다.",
    });
  }
}