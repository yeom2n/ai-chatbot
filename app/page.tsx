"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "인공지능학과",
  "물리학과",
  "경영학과",
  "미적분Ⅱ",
  "경제",
  "데이터 과학",
  "인공지능 기초",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "안녕하세요 👋\n운양고 선택과목 안내 챗봇입니다.\n학과, 과목명을 입력하면 선택과목 정보를 정리해드릴게요.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileView, setMobileView] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function sendMessage(text?: string) {
    const question = text || input;
    if (!question.trim() || loading) return;

    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: question },
    ];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: data.reply || "답변 생성 실패" },
      ]);
    } catch {
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "오류가 발생했습니다." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 text-slate-900">
      <div
        className={`mx-auto flex h-full flex-col ${
          mobileView ? "max-w-full p-0" : "max-w-7xl px-4 py-5"
        }`}
      >
        {!mobileView && (
          <header className="mb-5 flex shrink-0 items-center justify-between rounded-[28px] border border-white/70 bg-white/85 px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
            <div>
              <div className="text-sm font-black text-blue-600">
                Unyang High School
              </div>

              <h1 className="mt-1 text-2xl font-black tracking-tight">
                선택과목 상담 챗봇
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                2022 개정 교육과정 기반 선택과목 안내
              </p>
            </div>

            <div className="flex gap-2 rounded-full bg-slate-100 p-1">
              <button
                onClick={() => setMobileView(false)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  !mobileView
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                PC
              </button>

              <button
                onClick={() => setMobileView(true)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  mobileView
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                모바일
              </button>
            </div>
          </header>
        )}

        {mobileView && (
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
            <div>
              <div className="text-sm font-black">운양고 선택과목 챗봇</div>
              <div className="text-xs text-slate-500">모바일 채팅 모드</div>
            </div>

            <button
              onClick={() => setMobileView(false)}
              className="rounded-full bg-slate-900 px-3 py-2 text-xs font-black text-white"
            >
              PC
            </button>
          </header>
        )}

        <div
          className={`grid min-h-0 flex-1 ${
            mobileView
              ? "grid-cols-1"
              : "grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]"
          }`}
        >
          {!mobileView && (
            <aside className="min-h-0 overflow-y-auto rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur">
              <div className="text-sm font-black text-slate-700">추천 질문</div>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                자주 묻는 질문을 바로 확인해보세요.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={loading}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </aside>
          )}

          <section
            className={`flex min-h-0 flex-col overflow-hidden bg-white/90 backdrop-blur ${
              mobileView
                ? "rounded-none border-0"
                : "rounded-[28px] border border-white/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
            }`}
          >
            {!mobileView && (
              <div className="shrink-0 border-b border-slate-200/80 px-6 py-4">
                <div className="text-base font-black">상담 채팅</div>
                <div className="text-xs text-slate-500">
                  자료 기반으로 선택과목 정보를 안내합니다.
                </div>
              </div>
            )}

            <div
              ref={scrollAreaRef}
              className={`min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50 ${
                mobileView ? "px-3 py-4" : "px-5 py-6"
              }`}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`mb-4 flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`rounded-[26px] shadow-sm ${
                      mobileView
                        ? "max-w-[88%] px-4 py-3 text-[15px] leading-7"
                        : "max-w-[78%] px-5 py-4 text-[15px] leading-8"
                    } ${
                      m.role === "user"
                        ? "rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-200/50"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    <div
                      className={`mb-2 text-xs font-black ${
                        m.role === "user" ? "text-blue-100" : "text-slate-400"
                      }`}
                    >
                      {m.role === "user" ? "나" : "AI 상담사"}
                    </div>

                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content
                          .split("\n")
                          .filter((line) => {
                            const t = line.trim();

                            if (!t) return true;
                            if (t.includes("이런 학생에게 적합")) return false;
                            if (t.includes("추천 학생")) return false;
                            if (t.includes("자료에 명시되지 않음")) return false;
                            if (t === "없음") return false;
                            if (t.includes("미기재")) return false;

                            return true;
                          })
                          .join("\n")}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-sm">
                  답변 생성 중...
                </div>
              )}
            </div>

            <footer className="shrink-0 border-t border-slate-200/80 bg-white/95 p-3">
              {mobileView && (
                <div className="mb-3">
                  <div className="mb-2 text-[11px] font-black text-slate-400">
                    추천 질문
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        disabled={loading}
                        className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-blue-100 hover:text-blue-700 disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100">
                <input
                  value={input}
                  disabled={loading}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder="질문을 입력하세요"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[16px] outline-none"
                />

                <button
                  onClick={() => sendMessage()}
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-blue-600 disabled:bg-slate-400"
                >
                  전송
                </button>
              </div>
            </footer>
          </section>
        </div>
      </div>

      <style jsx global>{`
        html,
        body {
          height: 100%;
          overflow: hidden;
        }

        input,
        textarea,
        select {
          font-size: 16px !important;
        }

        .markdown-body p {
          margin: 0 0 10px 0;
        }

        .markdown-body ul {
          margin: 6px 0 14px 0;
          padding-left: 20px;
        }

        .markdown-body li {
          margin: 4px 0;
        }

        .markdown-body strong {
          font-weight: 900;
        }

        .markdown-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 14px;
        }

        .markdown-body th,
        .markdown-body td {
          border: 1px solid #cbd5e1;
          padding: 9px 10px;
          text-align: left;
        }

        .markdown-body th {
          background: #eff6ff;
          font-weight: 900;
        }
      `}</style>
    </main>
  );
}