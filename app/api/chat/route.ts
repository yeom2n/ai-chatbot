import { NextResponse } from "next/server";
import { searchDocuments } from "@/utils/search";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

function getQuestionType(query: string) {
  if (
    query.includes("단위") ||
    query.includes("이수") ||
    query.includes("어떤 과목") ||
    query.includes("과목이야") ||
    query.includes("뭐 배우") ||
    query.includes("추천돼")
  ) {
    return "subject";
  }

  if (
    query.includes("대학") ||
    query.includes("중앙대") ||
    query.includes("권장과목")
  ) {
    return "university";
  }

  if (
    query.includes("학과") ||
    query.includes("전공") ||
    query.includes("계열")
  ) {
    return "major";
  }

  return "general";
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

    const questionType = getQuestionType(userMessage);

    const results = searchDocuments(userMessage);
    const context = results.join("\n\n---\n\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `
당신은 운양고등학교 선택과목 상담 챗봇입니다.

학생의 진로와 관심 분야를 바탕으로
2022 개정 교육과정 선택과목을 추천합니다.

반드시 제공된 md 자료를 우선 참고하세요.

중요 규칙:
- 자료에 없는 과목명은 절대 만들지 마세요.
- 선택 구분, 단위수, 성취도 정보는 자료 기반으로만 작성하세요.
- 답변은 너무 딱딱하지 않게 자연스럽게 작성하세요.
- 필요할 때만 소제목을 사용하세요.
- 줄글과 목록을 적절히 섞어 가독성 있게 작성하세요.

과목 질문이면:
- 어떤 내용을 배우는지
- 선택 구분
- 단위수
- 추천 학생
- 관련 학과
정도를 자연스럽게 설명하세요.

학과 질문이면:
- 학과에서 배우는 내용
- 관련 직업
- 추천 과목
을 자연스럽게 연결해서 설명하세요.

특히:
- 간호/의학 계열 → 생명과학, 화학 계열 우선 고려
- 컴퓨터공학 계열 → 수학·정보 중심
- 경영/경제 계열 → 사회탐구·경제 관련 과목 중심
- 예체능 계열 → 예술 관련 과목 중심

답변은 상담하듯 친근하게 작성하세요.
`,
          },
          {
            role: "user",
            content: `
질문:
${userMessage}

제공된 md 자료:
${context || "관련 자료를 찾지 못했습니다."}
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
      reply: "서버 오류가 발생했습니다.",
    });
  }
}