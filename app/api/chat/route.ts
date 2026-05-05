import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type Chunk = {
  content: string;
  title?: string;
  keywords?: string[];
};

// =====================
// 기본 유틸
// =====================

function loadChunks(): Chunk[] {
  try {
    const filePath = path.join(process.cwd(), "data", "chunks.json");
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ");
}

// =====================
// 학과 분류
// =====================

function getMajorType(query: string) {
  if (query.match(/경영|경제|회계|마케팅|무역/)) return "business";

  if (query.match(/컴공|컴퓨터|소프트웨어|인공지능|AI/)) return "computer";

  if (query.match(/화학공학|화공|신소재|재료|환경공학/))
    return "chem_engineering";

  if (query.match(/생명공학|바이오|의생명/)) return "bio_engineering";

  if (query.match(/기계|전기|전자|건축|토목|항공|공학|공대/))
    return "engineering";

  if (query.match(/미술|디자인|메이크업|헤어|뷰티|체육|예체능/))
    return "art";

  return "general";
}

// =====================
// 질문 유형 판단
// =====================

function isInfoQuery(query: string) {
  const q = query.trim();

  if (q.length <= 10) return true;

  if (
    q.includes("뭐야") ||
    q.includes("설명") ||
    q.includes("무슨 학과")
  ) {
    return true;
  }

  return false;
}

// =====================
// 검색 키워드 확장
// =====================

function expandTerms(query: string) {
  const base = query.split(" ");
  const type = getMajorType(query);

  const extra: string[] = [];

  if (type === "business") {
    extra.push(
      "경제",
      "금융",
      "사회",
      "정치",
      "법",
      "사회문제",
      "통계"
    );
  }

  if (type === "computer") {
    extra.push(
      "컴퓨터",
      "프로그래밍",
      "인공지능",
      "데이터",
      "수학",
      "물리"
    );
  }

  if (type === "engineering") {
    extra.push("공학", "수학", "미적분", "물리");
  }

  if (type === "chem_engineering") {
    extra.push("화학", "물질", "반응");
  }

  if (type === "bio_engineering") {
    extra.push("생명", "세포", "유전");
  }

  if (type === "art") {
    extra.push("미술", "디자인", "창작", "예술");
  }

  return [...base, ...extra];
}

// =====================
// chunk 점수 계산
// =====================

function scoreChunk(chunk: Chunk, query: string) {
  const terms = expandTerms(query).map(normalize);
  const content = normalize(chunk.content);

  let score = 0;

  for (const term of terms) {
    if (content.includes(term)) score += 1;
  }

  const type = getMajorType(query);

  // 계열별 보정
  if (type === "business" && content.includes("경제")) score += 5;
  if (type === "computer" && content.includes("프로그래밍")) score += 5;
  if (type === "engineering" && content.includes("물리")) score += 5;
  if (type === "chem_engineering" && content.includes("화학")) score += 5;
  if (type === "bio_engineering" && content.includes("생명")) score += 5;
  if (type === "art" && content.includes("미술")) score += 5;

  return score;
}

// =====================
// 검색
// =====================

function searchChunks(query: string, chunks: Chunk[]) {
  return chunks
    .map((c) => ({
      chunk: c,
      score: scoreChunk(c, query),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.chunk);
}

// =====================
// API
// =====================

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;

    const userMessage =
      messages.filter((m: Message) => m.role === "user").at(-1)?.content || "";

    const majorType = getMajorType(userMessage);
    const infoMode = isInfoQuery(userMessage);

    const chunks = loadChunks();
    const found = searchChunks(userMessage, chunks);

    const context = found.map((c) => c.content).join("\n\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
너는 고등학생 진로 상담 AI다.

[학과 계열]
${majorType}

[답변 모드]
${infoMode ? "설명 포함" : "추천 중심"}

[규칙]
- 제공된 자료를 우선 사용한다
- 부족하면 일반 지식 보완
- 출처 쓰지 않는다
- 문장 짧게, 목록 형태

[계열 규칙]
- 경영: 사회탐구 중심
- 컴공: 수학 + 정보 + 물리 (화학 제외)
- 일반 공학: 수학 + 물리
- 화공: 화학 포함
- 생명공학: 생명 + 화학
- 예체능: 실기/창작 중심

[형식]

설명 모드:
- 한줄 요약
- 학과 설명
- 과목 추천
- 정리

추천 모드:
- 한줄 요약
- 과목 추천
- 정리
`,
          },
          {
            role: "user",
            content: `
질문: ${userMessage}

자료:
${context}
`,
          },
        ],
      }),
    });

    const data = await res.json();

    return NextResponse.json({
      reply: data.choices?.[0]?.message?.content || "오류",
    });
  } catch {
    return NextResponse.json({
      reply: "서버 오류",
    });
  }
}