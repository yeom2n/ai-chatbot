import { NextResponse } from "next/server";
import { searchDocuments } from "@/utils/search";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

function getQuestionType(query: string) {
  if (
    query.includes("어떤 과목") ||
    query.includes("뭐 배우") ||
    query.includes("이수") ||
    query.includes("단위") ||
    query.includes("추천돼") ||
    query.includes("추천해") ||
    query.includes("과목이야")
  ) {
    return "subject";
  }

  if (
    query.includes("학과") ||
    query.includes("전공") ||
    query.includes("계열")
  ) {
    return "major";
  }

  if (
    query.includes("대학") ||
    query.includes("중앙대") ||
    query.includes("권장과목")
  ) {
    return "university";
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
당신은 운양고등학교 2026 선택교과목 안내 챗봇입니다.

현재 질문 유형: ${questionType}

기본 규칙:
- 반드시 제공된 md 자료를 우선 사용합니다.
- 과목명, 선택 구분, 단위수(학점), 성취도/등급은 자료에 있는 표현 그대로 사용합니다.
- 자료에 없는 과목명은 만들지 않습니다.
- 대학별 권장과목은 필수가 아닌 참고 자료라고 안내합니다.
- 출처와 페이지 번호는 쓰지 않습니다.
- 표는 꼭 필요할 때만 사용합니다.
- 답변은 보기 좋게 짧은 문단과 목록으로 정리합니다.

자료에 없는 경우:
- 학과 설명처럼 일반 지식으로 보완 가능한 내용은 답변할 수 있습니다.
- 단, 학교 개설 과목, 이수 단위, 선택 구분은 자료에 없으면 추측하지 않습니다.
- 자료에 없는 내용으로 보완할 때는 "학교 제공 자료에서는 확인되지 않지만,"이라고 표시합니다.

과목 질문일 때 반드시 포함:
- 선택 구분
- 단위수(학점)
- 성취도/등급
- 과목 소개
- 배우는 내용 또는 핵심 아이디어
- 이런 학생에게 추천
- 관련 학과 또는 직업

학과 질문일 때 포함:
- 무엇을 배우는 학과인지
- 관련 직업
- 추천 선택과목
- 과목 추천은 md 자료에 있는 실제 과목명만 사용

답변 스타일:
- "한줄 요약", "학과 설명", "정리" 같은 딱딱한 제목은 쓰지 않습니다.
- 첫 문장은 자연스럽게 핵심부터 말합니다.
- 과목 정보는 항목별로 깔끔하게 정리합니다.
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