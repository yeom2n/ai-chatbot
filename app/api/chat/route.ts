import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

type Chunk = {
  source?: string;
  page?: number;
  title?: string;
  content: string;
  keywords?: string[];
};

// PDF에서 추출된 chunks 불러오기
function loadChunks(): Chunk[] {
  try {
    const filePath = path.join(process.cwd(), "data", "chunks.json");
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

// 텍스트 정규화
function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ");
}

// 검색 키워드 확장
function expandTerms(query: string) {
  const base = query
    .replace(/[?!.]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const extra: string[] = [];

  if (query.includes("5등급") || query.includes("내신")) {
    extra.push(
      "5등급",
      "5등급제",
      "내신체제",
      "석차등급",
      "1등급",
      "2등급",
      "3등급",
      "4등급",
      "5등급"
    );
  }

  if (query.includes("컴공") || query.includes("컴퓨터공학")) {
    extra.push("컴퓨터공학", "정보", "프로그래밍", "인공지능", "미적분", "물리학");
  }

  if (query.includes("경영")) {
    extra.push("경영", "경제", "확률과 통계");
  }

  return [...new Set([...base, ...extra])];
}

// chunk 검색
function searchChunks(query: string, chunks: Chunk[]) {
  const terms = expandTerms(query).map(normalize);

  const scored = chunks.map((chunk) => {
    const content = normalize(chunk.content);
    const title = normalize(chunk.title || "");
    const keywords = normalize((chunk.keywords || []).join(" "));

    let score = 0;

    for (const term of terms) {
      if (!term) continue;
      if (content.includes(term)) score += 2;
      if (title.includes(term)) score += 3;
      if (keywords.includes(term)) score += 4;
    }

    // 5등급제 관련 가중치
    if (query.includes("5등급") || query.includes("내신")) {
      if (content.includes("5등급")) score += 10;
      if (content.includes("내신체제")) score += 10;
    }

    return { chunk, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.chunk);
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reply: "API 키가 설정되지 않았습니다.",
      });
    }

    const userMessage =
      messages?.filter((m: Message) => m.role === "user").at(-1)?.content || "";

    const chunks = loadChunks();
    const foundChunks = searchChunks(userMessage, chunks);

    // 🔥 핵심: PDF 내용만 context로 전달
    const context =
      foundChunks.length > 0
        ? foundChunks.map((c) => c.content.slice(0, 2000)).join("\n\n")
        : "";

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
너는 고등학생의 진로에 맞는 선택과목을 추천하는 AI다.

[핵심 목표]
- 학과에 맞는 과목을 정확하게 추천한다.
- 추측이나 일반적인 상식으로 답하지 않는다.

[절대 규칙]
- 반드시 제공된 자료(context)에 있는 과목만 사용한다.
- 자료에 없는 과목은 절대 추가하지 않는다.
- 애매하면 추천하지 않는다.

[학과 분류 기준]
- 문과 계열 (경영, 경제, 법, 사회 등)
  → 반드시 사회탐구, 경제, 정치, 역사 중심으로 추천
  → 과학 과목은 필요할 때만 최소한으로 포함

- 이과/공학 계열 (컴퓨터공학, 전자공학 등)
  → 수학, 물리 중심
  → 생명/지구는 반드시 필요할 때만 포함
  → 하지만 드물게 화학이랑 별로 관련이 없는(컴퓨터공학과) 또는 물리랑 관련 없는 공학 계열엔 관련 없는 과목은 추천하지 말 것
  → 컴퓨터공학과엔 화학 추천하지 말 것 

- 의학 계열 (의예과, 간호학과 등)
  → 생명과학, 화학 중심
  → 물리, 지구는 필요할 때만 최소한으로 포함

- 예체능 계열 (미술, 디자인, 메이크업, 헤어, 체육 등)
→ 실기, 창작, 표현 중심 과목 우선
→ 예술, 디자인, 미디어, 생활 관련 과목 포함
→ 수학/과학은 필수 최소 수준만 유지
→ 전공과 직접 관련 없는 과목은 추천하지 않는다

[예체능 구체 규칙]
- 미술/디자인:
  → 미술, 디자인, 미디어, 창의 관련 과목 중심

- 메이크업/헤어:
  → 미용, 생활, 디자인, 예술 관련 과목 중심
  → 실습/표현/창작 관련 과목 우선

- 체육:
  → 체육, 운동, 건강 관련 과목 중심

[금지]
- 의미 없이 과학 과목 넣기
- 모든 학과에 동일한 과목 추천
- 일반적인 상식으로 답변하기
- 2022개정 교육과정에 없는 과목 추천하기
- 선택과목이 아닌 공통과목을 추천하기(예시. 문학, 대수, 미적분1 등등)
[답변 스타일]
- 핵심만 간결하게
- 줄글 길게 쓰지 않기
- 항목별로 정리

`,
          },
          {
            role: "user",
            content: `
질문: ${userMessage}

참고 자료:
${context}
`,
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({
        reply: `OpenAI 오류: ${data.error?.message || "알 수 없는 오류"}`,
      });
    }

    return NextResponse.json({
      reply: data.choices?.[0]?.message?.content || "답변 생성 실패",
    });
  } catch {
    return NextResponse.json({
      reply: "서버 오류 발생",
    });
  }
}