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
  return s.replace(/\s+/g, "").toLowerCase();
}

function findMajor(query: string, db: DB) {
  const q = normalize(query);
  const names = Object.keys(db.majors);

  return (
    names.find((name) => q.includes(normalize(name))) ||
    names.find((name) => q.includes(normalize(name.replace("학과", "")))) ||
    ""
  );
}

function findSubject(query: string, db: DB) {
  const q = normalize(query);
  const names = Object.keys(db.subjects);

  return names.find((name) => q.includes(normalize(name))) || "";
}

function formatSubject(s: Subject) {
  return `
${s.name}은(는) 운양고 선택과목 자료에 등록된 과목입니다.

**선택 구분**
- ${s.selectionType || "자료에 명시되지 않음"}

**단위수**
- ${s.credits || "자료에 명시되지 않음"}

**성취도 / 등급**
- ${s.achievement || "자료에 명시되지 않음"}

**과목 내용**
- ${s.description || "자료에 명시되지 않음"}

**추천 학생**
- ${s.recommendedFor || "자료에 명시되지 않음"}

**관련 학과**
- ${s.relatedMajors || "자료에 명시되지 않음"}

**관련 직업**
- ${s.relatedJobs || "자료에 명시되지 않음"}
`.trim();
}

function formatMajor(major: Major, db: DB) {
  const subjects = (major.recommendedSubjects || [])
    .map((name) => db.subjects[name])
    .filter(Boolean);

  const subjectLines =
    subjects.length > 0
      ? subjects
          .map((s) => {
            const detail = [s.selectionType, s.credits].filter(Boolean).join(", ");
            return `- **${s.name}**${detail ? ` (${detail})` : ""}: ${s.description || "자료에 설명이 있습니다."}`;
          })
          .join("\n")
      : "- 학교 제공 자료에서 이 학과와 연결된 추천 과목을 찾지 못했습니다.";

  const jobs =
    major.jobs && major.jobs.length > 0
      ? major.jobs.map((j) => `- ${j}`).join("\n")
      : "- 자료에 명시되지 않음";

  return `
${major.name}는 자료에 따르면 다음과 같은 내용을 중심으로 배우는 학과입니다.

**학과 설명**
- ${major.description || "자료에 명시되지 않음"}

**이런 학생에게 적합**
- ${major.recommendedFor || "자료에 명시되지 않음"}

**관련 직업**
${jobs}

**추천 선택과목**
${subjectLines}
`.trim();
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const db = loadDB();

    if (!db) {
      return NextResponse.json({
        reply:
          "data/db.json 파일이 없습니다. 먼저 `node scripts/build-db.mjs`를 실행해 주세요.",
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
      reply:
        "학교 제공 자료에서 해당 학과나 과목 정보를 찾지 못했습니다. 학과명이나 과목명을 정확히 입력해 주세요.",
    });
  } catch {
    return NextResponse.json({
      reply: "서버 오류가 발생했습니다.",
    });
  }
}