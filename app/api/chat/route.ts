import { NextResponse } from "next/server";
import { buildContext } from "@/utils/search";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

function getQuestionType(query: string) {
  if (
    query.includes("과목") ||
    query.includes("단위") ||
    query.includes("이수") ||
    query.includes("뭐 배워") ||
    query.includes("어떤 내용") ||
    query.includes("추천 학생")
  ) {
    return "subject";
  }

  if (
    query.includes("학과") ||
    query.includes("전공") ||
    query.includes("계열") ||
    query.includes("진로")
  ) {
    return "major";
  }

  if (
    query.includes("대학") ||
    query.includes("권장") ||
    query.includes("중앙대")
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
    const { context, hasMajor, hasSubject } = buildContext(userMessage);

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

현재 질문 유형: ${questionType}
학과 섹션 검색 여부: ${hasMajor ? "찾음" : "못 찾음"}
과목 섹션 검색 여부: ${hasSubject ? "찾음" : "못 찾음"}

가장 중요한 원칙:
- 반드시 제공된 md 자료를 최우선으로 사용합니다.
- 학과 추천은 제공된 [학과 상세 안내]와 [관련 과목 정보]를 근거로 합니다.
- 과목 설명은 제공된 [과목 상세 정보]를 근거로 합니다.
- 자료에 없는 과목명, 단위수, 선택 구분은 절대 만들지 않습니다.
- 생소한 학과라도 자료에 섹션이 있으면 그 섹션을 기준으로 답합니다.
- 생소한 학과가 자료에 없으면 과목 추천을 단정하지 말고 "학교 제공 자료에서는 해당 학과 정보를 찾지 못했습니다"라고 말합니다.
- 대학별 권장과목은 필수가 아닌 참고 자료라고 안내합니다.
- 출처와 페이지 번호는 쓰지 않습니다.
- 답변은 상담하듯 자연스럽게 작성합니다.
- 필요한 소제목은 **굵은 글씨**로 작성합니다.

과목 질문 답변:
- 과목 소개
- 선택 구분
- 단위수 또는 학점
- 성취도/등급
- 추천 학생
- 관련 학과
- 관련 직업
자료에 있는 범위에서 최대한 포함합니다.

학과 질문 답변:
- 무엇을 배우는 학과인지
- 이런 학생에게 맞는지
- 관련 직업
- 추천 선택과목
을 자료 기반으로 설명합니다.
추천 과목은 반드시 제공된 자료 안에 등장한 과목명만 사용합니다.

추천 질문 답변:
- 교과군별로 묶어서 추천합니다.
- 각 과목 옆에 짧은 이유를 붙입니다.
- 자료에 있는 과목명만 사용합니다.

자료 부족 시:
- 일반적인 학과 설명은 가능하지만, 선택과목 추천은 자료 기반으로만 합니다.
- 자료에 없는 과목을 추천하지 않습니다.
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