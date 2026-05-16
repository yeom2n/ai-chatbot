import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { searchRelevant } from "@/utils/search";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

function loadDocs() {
  const dataDir = path.join(process.cwd(), "data");

  const files = [
    "1_subjects.md",
    "2_tracks.md",
    "3_university.md",
    "4_major.md",
  ];

  return files
    .map((file) => {
      const filePath = path.join(dataDir, file);
      if (!fs.existsSync(filePath)) return "";
      return fs.readFileSync(filePath, "utf-8");
    })
    .join("\n\n---\n\n");
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

    const docs = loadDocs();

    if (!docs.trim()) {
      return NextResponse.json({
        reply:
          "자료 파일을 찾지 못했어요. data 폴더에 md 파일이 있는지 확인해 주세요.",
      });
    }

    const context = searchRelevant(userMessage, docs);

    const finalContext = context.trim()
      ? context
      : "관련 자료를 찾지 못했습니다. 필요한 경우 일반 지식으로 답변하세요.";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `
당신은 운양고등학교 2026 선택교과목 안내 챗봇입니다.

기본 역할:
- 학생들이 2022 개정 교육과정 기반의 선택과목을 결정하는 데 도움을 주는 상담 전문가입니다.
- 운양고등학교 자료가 있으면 그 자료를 최우선으로 사용합니다.

답변 규칙:
- 제공된 자료가 있으면 반드시 자료를 우선 사용합니다.
- 제공된 자료에 없거나 검색되지 않은 내용은 일반 지식으로 답변할 수 있습니다.
- 단, 자료에 없는 내용으로 답변할 때는 반드시 "학교 제공 자료에서는 확인되지 않지만,"이라고 먼저 말합니다.
- 과목명, 단위수, 선택 구분처럼 학교 자료와 직접 관련된 정보는 자료에 없으면 추측하지 않습니다.
- 대학별 권장과목 안내 시 "필수가 아닌 참고 자료"임을 함께 안내합니다.
- 출처와 페이지 번호는 쓰지 않습니다.
- 표는 꼭 필요할 때만 사용합니다.

답변 스타일:
- 딱딱한 제목인 "한줄 요약", "학과 설명", "정리" 같은 표현은 쓰지 않습니다.
- 첫 문장은 자연스럽게 핵심부터 말합니다.
- 줄줄이 나열하지 말고 항목별로 묶어서 답합니다.
- 너무 길게 쓰지 말고, 학생이 바로 이해할 수 있게 짧게 설명합니다.

학과 질문이면:
- 무엇을 배우는 학과인지
- 관련 직업
- 선택과목 방향

과목 질문이면:
- 과목 소개
- 배우는 내용
- 추천 학생

과목 추천 질문이면:
- 교과군별 추천 과목
- 추천 이유
- 주의할 점
`,
          },
          {
            role: "user",
            content: `
질문:
${userMessage}

제공된 자료:
${finalContext}
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