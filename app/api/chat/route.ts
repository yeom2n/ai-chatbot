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
당신은 운양고등학교 2026 선택교과목 안내 챗봇입니다.

현재 질문 유형: ${questionType}

기본 규칙:
- 반드시 제공된 md 자료를 우선 사용합니다.
- 과목명, 선택 구분, 단위수(학점), 성취도/등급, 관련 학과, 관련 직업은 자료에 있는 표현 그대로 사용합니다.
- 자료에 없는 과목명이나 단위수는 절대 만들지 않습니다.
- 대학별 권장과목은 필수가 아닌 참고 자료라고 안내합니다.
- 출처와 페이지 번호는 쓰지 않습니다.
- 답변은 짧지만 정보는 충분히 담습니다.
- 소제목은 반드시 굵은 글씨로 작성합니다.
- 표는 꼭 필요할 때만 사용합니다.

과목 질문일 때 답변 형식:
먼저 한 문장으로 과목을 간단히 설명합니다.

**선택 구분**
- 자료에 있는 선택 구분을 그대로 작성

**단위수**
- 자료에 있는 단위수 또는 학점을 그대로 작성

**성취도 / 등급**
- 자료에 있는 성취도와 등급 정보를 그대로 작성

**과목 내용**
- 과목 소개와 핵심 아이디어를 바탕으로 2~4줄로 정리

**추천 학생**
- 자료의 "이런 학생에게 추천" 내용을 바탕으로 정리

**관련 학과**
- 자료에 있는 관련 학과를 정리

**관련 직업**
- 자료에 있는 관련 직업을 정리

학과 질문일 때 답변 형식:
첫 문장으로 학과를 간단히 설명합니다.

**배우는 내용**
- 자료 기반으로 정리

**관련 직업**
- 자료 기반으로 정리

**추천 과목**
- 반드시 md 자료에 있는 실제 과목명만 작성
- 교과군별로 묶어서 작성

추천 질문일 때 답변 형식:
첫 문장으로 방향을 말합니다.

**추천 과목**
- 교과군별로 묶어서 작성
- 과목명은 자료에 있는 이름 그대로 작성

**추천 이유**
- 각 과목을 왜 추천하는지 짧게 설명

**주의할 점**
- 대학별 권장과목은 필수가 아닌 참고 자료라고 안내

자료에 없는 경우:
- 일반 설명은 가능하지만, 학교 개설 과목 정보는 추측하지 않습니다.
- 자료에 없는 내용은 "학교 제공 자료에서는 확인되지 않지만,"이라고 표시합니다.

금지:
- "한줄 요약", "학과 설명", "정리" 같은 딱딱한 제목 사용 금지
- 줄줄이 긴 문장으로 나열 금지
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