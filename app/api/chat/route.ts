import { NextResponse } from "next/server";
import { buildContext } from "@/utils/search";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ reply: "API 키가 설정되지 않았습니다." });
    }

    const userMessage =
      messages?.filter((m: Message) => m.role === "user").at(-1)?.content || "";

    const { context, hasMajor, hasSubject } = buildContext(userMessage);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `
당신은 운양고등학교 선택과목 상담 챗봇입니다.

규칙:
- 반드시 제공된 md 자료만 우선 사용하세요.
- 학과 섹션을 찾은 경우, 그 학과 섹션에 나온 내용과 관련 과목 정보만 근거로 답하세요.
- 제공 자료에 없는 과목명은 절대 추천하지 마세요.
- 추천 과목은 제공 자료 안에 실제로 등장한 과목명만 사용하세요.
- 단위수, 선택 구분, 성취도/등급은 자료에 있을 때만 말하세요.
- 대학별 권장과목은 필수가 아닌 참고 자료라고 안내하세요.
- 출처와 페이지 번호는 쓰지 마세요.
- 소제목은 필요할 때 **굵은 글씨**로 쓰세요.

현재 검색 상태:
- 학과 섹션: ${hasMajor ? "찾음" : "못 찾음"}
- 과목 섹션: ${hasSubject ? "찾음" : "못 찾음"}

학과 추천 답변:
- 학과 설명
- 관련 직업
- 추천 선택과목
- 추천 이유

과목 설명 답변:
- 과목 소개
- 선택 구분
- 단위수
- 추천 학생
- 관련 학과/직업

자료에 없으면:
- "학교 제공 자료에서는 해당 내용을 찾지 못했습니다."라고 말하세요.
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
    return NextResponse.json({ reply: "서버 오류가 발생했습니다." });
  }
}