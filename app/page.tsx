"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "컴퓨터공학과 과목 추천",
  "간호학과 선택과목 추천",
  "경영학과는 뭘 배우는 학과야?",
  "미적분Ⅱ는 어떤 과목이야?",
  "디자인 계열 추천 과목",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "안녕하세요 👋\n운양고 선택과목 안내 챗봇입니다.\n학과, 진로, 과목명을 입력하면 선택과목 정보를 정리해드릴게요.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileView, setMobileView] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
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
        {
          role: "assistant",
          content: data.reply || "답변을 생성하지 못했어요.",
        },
      ]);
    } catch {
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "오류가 발생했어요." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#f3f6fb] text-slate-900">
      <div
        className={`mx-auto flex h-full flex-col transition-all duration-300 ${
          mobileView ? "max-w-full px-3 py-3" : "max-w-7xl px-4 py-5"
        }`}
      >
        <header
          className={`mb-4 flex shrink-0 items-center justify-between rounded-3xl border border-slate-200 bg-white shadow-sm ${
            mobileView ? "px-4 py-4" : "px-6 py-5"
          }`}
        >
          <div className="min-w-0">
            <div className="text-sm font-bold text-blue-600">
              Unyang High School
            </div>
            <h1
              className={`mt-1 font-black ${
                mobileView ? "text-xl" : "text-2xl"
              }`}
            >
              선택과목 상담 챗봇
            </h1>
            <p
              className={`mt-1 text-slate-500 ${
                mobileView ? "text-xs" : "text-sm"
              }`}
            >
              2022 개정 교육과정 기반 선택과목 안내
            </p>
          </div>

          <div className="ml-3 flex shrink-0 gap-2">
            <button
              onClick={() => setMobileView(false)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                !mobileView
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              PC
            </button>

            <button
              onClick={() => setMobileView(true)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                mobileView
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              모바일
            </button>
          </div>
        </header>

        <div
          className={`grid min-h-0 flex-1 gap-4 ${
            mobileView
              ? "grid-cols-1"
              : "grid-cols-1 lg:grid-cols-[280px_1fr]"
          }`}
        >
          {!mobileView && (
            <aside className="min-h-0 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-black text-slate-700">추천 질문</div>

              <div className="mt-4 flex flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={loading}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-slate-900 p-4 text-white">
                <div className="text-sm font-black">TIP</div>
                <p className="mt-2 text-xs leading-5 text-slate-300">
                  “간호학과 추천 과목”, “미적분Ⅱ”, “컴퓨터공학과”처럼 짧게
                  입력해도 됩니다.
                </p>
              </div>
            </aside>
          )}

          <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div
              className={`shrink-0 border-b border-slate-200 ${
                mobileView ? "px-4 py-3" : "px-6 py-4"
              }`}
            >
              <div className="text-base font-black">상담 채팅</div>
              <div className="text-xs text-slate-500">
                자료 기반으로 선택과목 정보를 안내합니다.
              </div>
            </div>

            {mobileView && (
              <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-100 px-3 py-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={loading}
                    className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
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
                    className={`rounded-3xl shadow-sm ${
                      mobileView ? "max-w-[96%] px-4 py-3" : "max-w-[78%] px-5 py-4"
                    } ${
                      m.role === "assistant"
                        ? "max-h-[56vh] overflow-y-auto"
                        : ""
                    } ${
                      m.role === "user"
                        ? "rounded-br-md bg-blue-600 text-white"
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

                    <div
                      className={`markdown-body ${
                        mobileView ? "text-[14.5px] leading-7" : "text-[15px] leading-8"
                      }`}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
                  답변 생성 중...
                </div>
              )}
            </div>

            <footer
              className={`shrink-0 border-t border-slate-200 bg-white ${
                mobileView ? "p-3" : "p-4"
              }`}
            >
              <div className="flex gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm">
                <input
                  value={input}
                  disabled={loading}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder="예: 간호학과 선택과목 추천"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none"
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