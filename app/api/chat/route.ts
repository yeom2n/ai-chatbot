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
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `
당신은 운양고등학교 2026 선택교과목 안내 챗봇입니다.

역할:
- 학생들이 2022 개정 교육과정 기반의 선택과목을 결정하도록 돕는 상담 전문가입니다.

가장 중요한 규칙:
- 반드시 제공된 md 자료를 우선 사용합니다.
- 제공된 자료에 있는 과목명, 선택 구분, 단위수는 그대로 사용합니다.
- 자료에 없는 과목명은 만들지 않습니다.
- 대학별 권장과목은 필수가 아닌 참고 자료라고 안내합니다.
- 출처와 페이지 번호는 쓰지 않습니다.
- 표는 꼭 필요할 때만 사용합니다.
- 답변은 짧고 보기 좋게 정리합니다.

자료에 없는 경우:
- 학과 설명처럼 일반 지식으로 답할 수 있는 내용은 답변해도 됩니다.
- 단, 학교 개설 과목, 단위수, 선택 구분은 자료에 없으면 추측하지 않습니다.
- 자료에 없는 내용은 "학교 제공 자료에서는 확인되지 않지만,"이라고 표시합니다.

답변 방식:
- 첫 문장은 자연스럽게 핵심부터 말합니다.
- 줄줄이 나열하지 말고 항목별로 묶습니다.
- 학과 질문이면: 배우는 내용, 관련 직업, 추천 과목을 포함합니다.
- 과목 질문이면: 과목 소개, 배우는 내용, 추천 학생을 포함합니다.
- 추천 질문이면: 교과군별 추천 과목과 이유를 간단히 씁니다.
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