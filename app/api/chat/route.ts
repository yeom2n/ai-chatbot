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
  raw?: string;
  sourceFile?: string;
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
    .replace(/[()]/g, "")
    .toLowerCase();
}

function cleanToken(word: string) {
  return word
    .trim()
    .replace(/[?!.]/g, "")
    .replace(
      /(은|는|이|가|을|를|에|에서|으로|로|와|랑|하고|도|만|의|에게|한테|부터|까지|처럼|보다|마다|야|이야|인가|추천|설명|알려줘|뭐야|무엇|뭘|배우는|배워)$/g,
      ""
    );
}

function getTokens(query: string) {
  return query
    .replace(/[?!.]/g, " ")
    .split(/\s+/)
    .map(cleanToken)
    .filter((word) => word.length >= 2);
}

function removeMajorSuffix(name: string) {
  return name
    .replace(/학과$/g, "")
    .replace(/학부$/g, "")
    .replace(/전공$/g, "")
    .replace(/계열$/g, "");
}

function findExactBusinessMajor(db: DB) {
  const names = Object.keys(db.majors);

  return (
    names.find((name) => normalize(name) === "경영학과") ||
    names.find((name) => normalize(name).startsWith("경영학과")) ||
    ""
  );
}

function findMajor(query: string, db: DB) {
  const q = normalize(query);
  const tokens = getTokens(query).map(normalize);
  const names = Object.keys(db.majors);

  // 최우선: 경영학과는 스포츠경영학과보다 무조건 먼저
  if (q.includes("경영학과") || tokens.includes("경영학과") || tokens.includes("경영")) {
    const business = findExactBusinessMajor(db);
    if (business) return business;
  }

  // 1순위: 토큰이 학과명 전체와 정확히 일치
  for (const token of tokens) {
    const found = names.find((name) => normalize(name) === token);
    if (found) return found;
  }

  // 2순위: 토큰이 학과명에서 학과/학부/전공/계열 제거한 이름과 정확히 일치
  for (const token of tokens) {
    const found = names.find((name) => normalize(removeMajorSuffix(name)) === token);
    if (found) return found;
  }

  // 3순위: 질문에 학과명 전체가 등장
  const fullMatch = names
    .filter((name) => q.includes(normalize(name)))
    .sort((a, b) => normalize(a).length - normalize(b).length)[0];

  if (fullMatch) return fullMatch;

  return "";
}

function findSubject(query: string, db: DB) {
  const tokens = getTokens(query).map(normalize);
  const compactQuery = normalize(query);
  const names = Object.keys(db.subjects);

  const sorted = [...names].sort(
    (a, b) => normalize(b).length - normalize(a).length
  );

  for (const token of tokens) {
    const found = sorted.find((name) => normalize(name) === token);
    if (found) return found;
  }

  const fullMatch = sorted.find((name) => compactQuery.includes(normalize(name)));
  if (fullMatch) return fullMatch;

  return "";
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

function formatSubject(subject: Subject) {
  const sections: string[] = [];

  sections.push(`${subject.name}은(는) 운양고 선택과목 자료에 등록된 과목입니다.`);

  if (visible(subject.selectionType)) {
    sections.push(`**선택 구분**\n- ${subject.selectionType}`);
  }

  if (visible(subject.credits)) {
    sections.push(`**단위수**\n- ${subject.credits}`);
  }

  if (visible(subject.achievement)) {
    sections.push(`**성취도 / 등급**\n- ${subject.achievement}`);
  }

  if (visible(subject.description) || visible(subject.keyIdeas)) {
    const lines = [
      visible(subject.description) ? `- ${subject.description}` : "",
      visible(subject.keyIdeas) ? `- ${subject.keyIdeas}` : "",
    ].filter(Boolean);

    sections.push(`**과목 내용**\n${lines.join("\n")}`);
  }

  if (visible(subject.relatedMajors)) {
    sections.push(`**관련 학과**\n- ${subject.relatedMajors}`);
  }

  if (visible(subject.relatedJobs)) {
    sections.push(`**관련 직업**\n- ${subject.relatedJobs}`);
  }

  return sections.join("\n\n").trim();
}

function formatMajor(major: Major, db: DB) {
  const sections: string[] = [];

  sections.push(`${major.name}는 자료에 따르면 다음과 같은 내용을 중심으로 배우는 학과입니다.`);

  if (visible(major.description)) {
    sections.push(`**학과 설명**\n- ${major.description}`);
  }

  if (major.jobs && major.jobs.length > 0) {
    sections.push(`**관련 직업**\n${major.jobs.map((job) => `- ${job}`).join("\n")}`);
  }

  const subjects = (major.recommendedSubjects || [])
    .map((name) => db.subjects[name])
    .filter(Boolean);

  if (subjects.length > 0) {
    const subjectLines = subjects
      .map((subject) => {
        const detail = [subject.selectionType, subject.credits]
          .filter(visible)
          .join(", ");

        const description = visible(subject.description)
          ? subject.description
          : "자료에 과목 정보가 있습니다.";

        return `- **${subject.name}**${detail ? ` (${detail})` : ""}: ${description}`;
      })
      .join("\n");

    sections.push(`**추천 선택과목**\n${subjectLines}`);
  } else {
    sections.push(
      "**추천 선택과목**\n- 학교 제공 자료에서 이 학과와 직접 연결된 추천 과목을 찾지 못했습니다."
    );
  }

  return sections.join("\n\n").trim();
}

function searchMajorsByKeyword(query: string, db: DB) {
  const tokens = getTokens(query).map(normalize);

  const results = Object.values(db.majors)
    .map((major) => {
      const targetText = normalize(
        [
          major.name,
          major.description,
          major.raw,
          major.sourceFile,
          ...(major.jobs || []),
          ...(major.recommendedSubjects || []),
        ].join(" ")
      );

      let score = 0;

      for (const token of tokens) {
        if (targetText.includes(token)) score += 100;
      }

      return { major, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.major);

  return results;
}

function formatMajorSearchList(query: string, majors: Major[]) {
  const lines = majors.map((major) => {
    const subjectNames = (major.recommendedSubjects || []).slice(0, 5);
    const subjectText =
      subjectNames.length > 0 ? subjectNames.join(", ") : "추천 과목 정보 없음";

    return `- **${major.name}**: ${
      visible(major.description) ? major.description : "자료에 학과 정보가 있습니다."
    }\n  - 추천 과목: ${subjectText}`;
  });

  return `자료에서 "${query}"와 관련된 학과 정보를 찾았습니다.\n\n**관련 학과 / 계열**\n${lines.join(
    "\n"
  )}`;
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
      messages?.filter((message: Message) => message.role === "user").at(-1)
        ?.content || "";

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

    if (
      userMessage.includes("계열") ||
      userMessage.includes("진로") ||
      userMessage.includes("학과") ||
      userMessage.includes("전공")
    ) {
      const relatedMajors = searchMajorsByKeyword(userMessage, db);

      if (relatedMajors.length > 0) {
        return NextResponse.json({
          reply: formatMajorSearchList(userMessage, relatedMajors),
        });
      }
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