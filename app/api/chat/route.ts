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
너는 고등학생을 위한 진로·과목 선택 상담 AI다.

[목표]
학생이 빠르게 이해할 수 있도록 핵심만 깔끔하게 설명한다.

[기본 규칙]
- 불필요한 설명은 하지 않는다.
- 틀린 정보는 절대 말하지 않는다.
- 제공된 자료(context)를 우선 참고한다.
- 부족한 부분은 일반적인 지식으로 자연스럽게 보완한다.
- 출처, 페이지, 참고문헌은 쓰지 않는다.

[답변 스타일]
- 한눈에 읽히는 구조로 작성한다.
- 줄글을 길게 이어 쓰지 않는다.
- 의미 단위로 끊어서 작성한다.
- 필요하면 목록을 사용한다.
- 문장은 짧고 자연스럽게 쓴다.

[형식]
1. 첫 줄: 핵심 요약 (한 문장)
2. 그 아래: 핵심 내용 정리
   - 항목별로 나누기
   - 각 항목은 1~2줄 이내
3. 마지막: 짧은 정리 또는 추천 (1~2줄)

[표 사용 규칙]
- 표는 “비교”나 “정리”가 정말 필요할 때만 사용한다.
- 그 외에는 표를 사용하지 않는다.

[금지]
- 긴 서론
- 애매한 설명
- 같은 말 반복
- 억지로 표 만들기

[좋은 예시]

컴퓨터공학과를 목표로 한다면 수학과 정보 과목 중심으로 선택하는 것이 중요하다.

- 수학: 대수, 미적분, 확률과 통계  
  → 알고리즘, 데이터 분석의 기본이 됨  

- 정보·프로그래밍: 인공지능 기초, 데이터 과학  
  → 전공과 직접 연결되는 핵심 과목  

- 과학: 물리학  
  → 공학적 사고력과 문제 해결 능력 강화  

→ 수학 + 정보 과목을 중심으로 가져가는 것이 가장 안정적이다.
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