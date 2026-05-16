import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  searchRelevant,
  extractOpenedSubjects,
  filterSubjectsFromText,
} from "@/utils/search";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

function readDataFile(fileName: string) {
  const filePath = path.join(process.cwd(), "data", fileName);
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf-8");
}

function guessQuestionType(q: string) {
  if (q.includes("대학") || q.includes("중앙대") || q.includes("권장")) {
    return "university";
  }

  if (
    q.includes("어떤 과목") ||
    q.includes("추천") ||
    q.includes("가려면") ||
    q.includes("들어야")
  ) {
    return "recommend";
  }

  if (
    q.includes("학과") ||
    q.includes("전공") ||
    q.includes("계열")
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

    const subjectDoc = readDataFile("1_subjects.md");
    const trackDoc = readDataFile("2_tracks.md");
    const universityDoc = readDataFile("3_university.md");
    const majorDoc = readDataFile("4_major.md");

    if (!subjectDoc.trim()) {
      return NextResponse.json({
        reply: "1_subjects.md 파일을 찾지 못했어요. data 폴더를 확인해 주세요.",
      });
    }

    const openedSubjects = extractOpenedSubjects(subjectDoc);

    const subjectContext = searchRelevant(userMessage, subjectDoc, 10);
    const trackContext = searchRelevant(userMessage, trackDoc, 8);
    const universityContext = searchRelevant(userMessage, universityDoc, 8);
    const majorContext = searchRelevant(userMessage, majorDoc, 8);

    const combinedContext = [
      subjectContext,
      trackContext,
      universityContext,
      majorContext,
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");

    const recommendedCandidateSubjects = filterSubjectsFromText(
      combinedContext,
      openedSubjects
    );

    const questionType = guessQuestionType(userMessage);

    const finalContext = combinedContext.trim()
      ? combinedContext
      : "관련 자료를 찾지 못했습니다.";

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

현재 질문 유형: ${questionType}

가장 중요한 규칙:
- 과목 추천은 반드시 [운양고 개설 과목 목록]에 있는 과목만 사용하세요.
- [계열별 과목 안내]나 [대학별 권장과목]에 있어도, 운양고 개설 과목 목록에 없으면 추천하지 마세요.
- 과목명은 반드시 아래 [운양고 개설 과목 목록]에 적힌 이름 그대로만 쓰세요.
- 없는 과목명은 절대 만들지 마세요.
- 대학별 권장과목은 필수가 아니라 참고 자료라고 안내하세요.
- 자료에 없으면 "학교 제공 자료에서는 확인되지 않지만,"이라고 표시한 뒤 일반 설명만 하세요.
- 단, 학교 과목명/단위수/선택 구분은 자료에 없으면 추측하지 마세요.
- 출처와 페이지 번호는 쓰지 마세요.
- "한줄 요약", "학과 설명", "정리" 같은 딱딱한 제목은 쓰지 마세요.

운양고 개설 과목 목록:
${openedSubjects.join(", ")}

이번 검색에서 추천 후보로 확인된 개설 과목:
${recommendedCandidateSubjects.join(", ") || "없음"}

답변 방식:
- 첫 문장은 자연스럽게 핵심부터 말하세요.
- 줄줄이 나열하지 말고 교과군이나 목적별로 묶으세요.
- 추천 과목은 3~8개 정도만 제시하세요.
- 각 과목 옆에는 짧은 이유를 붙이세요.

학과 질문이면:
- 무엇을 배우는 학과인지
- 관련 진로/직업
- 운양고 개설 과목 중 추천 과목

과목 질문이면:
- 과목 소개
- 배우는 내용
- 추천 학생
- 관련 학과나 직업

대학별 권장과목 질문이면:
- 해당 대학 자료를 우선 사용
- 필수 이수 기준이 아닌 참고 자료라고 명시
`,
          },
          {
            role: "user",
            content: `
질문:
${userMessage}

[운양고 개설 과목 자료]
${subjectContext || "관련 내용 없음"}

[계열별 과목 안내 자료]
${trackContext || "관련 내용 없음"}

[대학별 권장과목 자료]
${universityContext || "관련 내용 없음"}

[계열별 학과 상세 안내 자료]
${majorContext || "관련 내용 없음"}

[전체 검색 결과]
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