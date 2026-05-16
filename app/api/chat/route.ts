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

    // 핵심: 자료에서 못 찾으면 GPT 호출 금지
    if (!context.trim()) {
      return NextResponse.json({
        reply: "제공된 자료에 해당 내용이 없습니다.",
      });
    }

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
당신은 운양고등학교 2026 선택교과목 안내 챗봇입니다.

반드시 지킬 규칙:
- 제공된 자료 안의 내용만 사용합니다.
- 자료에 없는 내용은 절대 추측하지 않습니다.
- 자료에 없으면 "제공된 자료에 해당 내용이 없습니다"라고 답합니다.
- 과목명, 단위수, 선택 구분은 자료 표현 그대로 사용합니다.
- 대학별 권장과목은 필수가 아닌 참고 자료라고 안내합니다.
- 출처와 페이지 번호는 쓰지 않습니다.
- 5등급제처럼 자료에 없는 일반 질문은 설명하지 말고 자료에 없다고 답합니다.

답변 스타일:
- 딱딱한 제목인 "한줄 요약", "학과 설명", "정리" 같은 표현은 쓰지 않습니다.
- 자연스럽게 첫 문장으로 답을 시작합니다.
- 학과 질문이면 배우는 내용, 관련 직업, 추천 과목을 나눠서 설명합니다.
- 과목 질문이면 과목 소개, 배우는 내용, 추천 학생을 나눠서 설명합니다.
- 과목 추천은 교과군별로 묶어서 짧게 정리합니다.
- 불필요하게 길게 쓰지 않습니다.
`,
          },
          {
            role: "user",
            content: `
질문:
${userMessage}

제공된 자료:
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
      reply: "서버 오류가 발생했습니다.",
    });
  }
}import { NextResponse } from "next/server";
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

    // 핵심: 자료에서 못 찾으면 GPT 호출 금지
    if (!context.trim()) {
      return NextResponse.json({
        reply: "제공된 자료에 해당 내용이 없습니다.",
      });
    }

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
당신은 운양고등학교 2026 선택교과목 안내 챗봇입니다.

반드시 지킬 규칙:
- 제공된 자료 안의 내용만 사용합니다.
- 자료에 없는 내용은 절대 추측하지 않습니다.
- 자료에 없으면 "제공된 자료에 해당 내용이 없습니다"라고 답합니다.
- 과목명, 단위수, 선택 구분은 자료 표현 그대로 사용합니다.
- 대학별 권장과목은 필수가 아닌 참고 자료라고 안내합니다.
- 출처와 페이지 번호는 쓰지 않습니다.
- 5등급제처럼 자료에 없는 일반 질문은 설명하지 말고 자료에 없다고 답합니다.

답변 스타일:
- 딱딱한 제목인 "한줄 요약", "학과 설명", "정리" 같은 표현은 쓰지 않습니다.
- 자연스럽게 첫 문장으로 답을 시작합니다.
- 학과 질문이면 배우는 내용, 관련 직업, 추천 과목을 나눠서 설명합니다.
- 과목 질문이면 과목 소개, 배우는 내용, 추천 학생을 나눠서 설명합니다.
- 과목 추천은 교과군별로 묶어서 짧게 정리합니다.
- 불필요하게 길게 쓰지 않습니다.
`,
          },
          {
            role: "user",
            content: `
질문:
${userMessage}

제공된 자료:
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
      reply: "서버 오류가 발생했습니다.",
    });
  }
}