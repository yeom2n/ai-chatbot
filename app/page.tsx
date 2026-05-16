"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "컴퓨터공학과 과목 추천",
  "경영학과는 뭘 배워?",
  "미적분Ⅱ는 어떤 과목이야?",
  "간호학과 선택과목 추천",
  "디자인 계열 추천 과목",
  "중앙대 소프트웨어학부 권장과목",
];

export default function Home() {
  const [input, setInput] = useState("");
  const [viewMode, setViewMode] = useState<"pc" | "mobile">("pc");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "안녕하세요. 운양고 선택과목 안내 챗봇입니다.\n학과, 진로, 과목명을 입력하면 자료를 바탕으로 정리해드릴게요.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const question = text || input;
    if (!question.trim() || loading) return;

    const updated: Message[] = [...messages, { role: "user", content: question }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: updated }),
      });

      const data = await res.json();

      setMessages([
        ...updated,
        { role: "assistant", content: data.reply || "답변을 생성하지 못했어요." },
      ]);
    } catch {
      setMessages([
        ...updated,
        { role: "assistant", content: "서버 오류가 발생했어요." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isMobile = viewMode === "mobile";

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div
        className={`mx-auto flex min-h-screen flex-col px-5 py-6 ${
          isMobile ? "max-w-[430px]" : "max-w-7xl"
        }`}
      >
        <header className="mb-5 flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div>
            <div className="text-sm font-bold text-blue-600">Unyang High School</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight">
              2026 선택과목 안내 챗봇
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              학과·진로·과목 정보를 자료 기반으로 정리해줍니다.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("pc")}
              className={`rounded-full px-4 py-2 text-sm font-black ${
                viewMode === "pc"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              PC
            </button>
            <button
              onClick={() => setViewMode("mobile")}
              className={`rounded-full px-4 py-2 text-sm font-black ${
                viewMode === "mobile"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              모바일
            </button>
          </div>
        </header>

        <div
          className={`grid flex-1 gap-5 ${
            isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[280px_1fr]"
          }`}
        >
          {!isMobile && (
            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-700">추천 질문</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                아래 질문을 누르면 바로 답변을 확인할 수 있어요.
              </p>

              <div className="mt-5 flex flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={loading}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-slate-900 p-4 text-white">
                <div className="text-sm font-black">사용 팁</div>
                <p className="mt-2 text-xs leading-5 text-slate-300">
                  “학과명”, “과목명”, “대학+학과”처럼 짧게 입력해도 됩니다.
                </p>
              </div>
            </aside>
          )}

          <section
            className={`flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${
              isMobile ? "min-h-[78vh]" : "min-h-[72vh]"
            }`}
          >
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="text-base font-black">상담 채팅</div>
              <div className="text-xs text-slate-500">
                답변은 자료 기반으로 정리되며, 필요한 경우 일반 설명이 보완됩니다.
              </div>
            </div>

            {isMobile && (
              <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3">
                {suggestions.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={loading}
                    className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50 px-5 py-6">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`mb-5 flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`rounded-3xl px-5 py-4 text-[15px] leading-8 shadow-sm ${
                      isMobile ? "max-w-[92%]" : "max-w-[78%]"
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

                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
                  자료 확인 중...
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <footer className="border-t border-slate-200 bg-white p-4">
              <div className="flex gap-3 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm">
                <input
                  value={input}
                  disabled={loading}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder="예: 간호학과 선택과목 추천"
                  className="flex-1 bg-transparent px-4 py-3 text-sm outline-none"
                />

                <button
                  onClick={() => sendMessage()}
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-6 text-sm font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? "대기" : "전송"}
                </button>
              </div>
            </footer>
          </section>
        </div>
      </div>

      <style jsx global>{`
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

        .markdown-body h1,
        .markdown-body h2,
        .markdown-body h3 {
          font-size: 16px;
          font-weight: 900;
          margin: 12px 0 8px 0;
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