import { NextResponse } from "next/server";
import { searchDocuments } from "@/utils/search";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

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
        temperature: 0.15,
        messages: [
          {
            role: "system",
            content: `
당신은 운양고등학교 선택과목 상담 챗봇입니다.

반드시 제공된 md 자료를 우선 참고하세요.

중요 규칙:
- 제공된 md 자료에 있는 내용을 최우선으로 사용합니다.
- 자료에 있는 과목명, 선택 구분, 단위수, 관련 학과, 관련 직업은 자료 표현을 우선 사용합니다.
- 자료에 없는 과목명, 단위수, 선택 구분은 만들지 않습니다.
- 대학별 권장과목은 필수가 아닌 참고 자료라고 안내합니다.
- 출처와 페이지 번호는 쓰지 않습니다.
- 답변은 상담하듯 자연스럽게 작성합니다.
- 필요할 때 소제목은 **굵은 글씨**로 작성합니다.
- 표는 꼭 필요할 때만 사용합니다.

과목 질문이면:
- 과목 소개
- 선택 구분
- 단위수 또는 학점
- 추천 학생
- 관련 학과
- 관련 직업
을 자료에서 확인되는 범위 안에서 설명합니다.

학과 질문이면:
- 무엇을 배우는 학과인지
- 이런 학생에게 맞는지
- 관련 직업
- 추천 선택과목
을 자연스럽게 설명합니다.

추천 질문이면:
- 진로와 관련된 과목을 교과군별로 묶어 추천합니다.
- 추천 이유를 짧게 붙입니다.
- 운양고 개설 과목 정보와 계열별 학과 안내를 함께 참고합니다.

자료에서 찾지 못한 내용은:
- "학교 제공 자료에서는 확인되지 않지만,"이라고 표시하고 일반 설명만 합니다.
- 단, 학교 개설 과목명/단위수/선택 구분은 추측하지 않습니다.
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