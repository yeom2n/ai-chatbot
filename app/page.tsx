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
  "중앙대 소프트웨어학부 권장과목",
  "디자인 계열 추천 과목",
  "간호학과 선택과목 추천",
];

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "안녕하세요. 운양고 선택과목 안내 챗봇입니다.\n진로, 학과, 과목명을 입력하면 자료를 바탕으로 정리해드릴게요.",
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

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #eef2ff 0%, #f8fafc 45%, #e0f2fe 100%)",
        color: "#0f172a",
        fontFamily:
          "Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 22,
        }}
      >
        <aside
          style={{
            background: "rgba(255,255,255,0.82)",
            border: "1px solid rgba(148,163,184,0.28)",
            borderRadius: 28,
            padding: 24,
            boxShadow: "0 24px 70px rgba(15,23,42,0.10)",
            height: "calc(100vh - 48px)",
            position: "sticky",
            top: 24,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              marginBottom: 18,
            }}
          >
            🎓
          </div>

          <h1 style={{ fontSize: 27, lineHeight: 1.25, margin: 0 }}>
            운양고
            <br />
            선택과목 챗봇
          </h1>

          <p
            style={{
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.7,
              marginTop: 14,
              marginBottom: 22,
            }}
          >
            학과, 진로, 과목명을 입력하면 2026 선택교과목 자료를 바탕으로
            보기 쉽게 정리합니다.
          </p>

          <div
            style={{
              fontSize: 13,
              color: "#475569",
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              borderRadius: 18,
              padding: 14,
              lineHeight: 1.6,
              marginBottom: 18,
            }}
          >
            질문 예시를 누르면 바로 상담을 시작할 수 있어요.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={loading}
                style={{
                  textAlign: "left",
                  padding: "13px 14px",
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "#1e293b",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 14,
                  opacity: loading ? 0.55 : 1,
                  boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </aside>

        <section
          style={{
            background: "rgba(255,255,255,0.88)",
            border: "1px solid rgba(148,163,184,0.25)",
            borderRadius: 28,
            height: "calc(100vh - 48px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 24px 70px rgba(15,23,42,0.10)",
          }}
        >
          <header
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(248,250,252,0.92)",
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>상담 채팅</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                짧게 물어봐도 괜찮아요. 예: “경영학과”, “미적분Ⅱ”
              </div>
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#1d4ed8",
                background: "#dbeafe",
                border: "1px solid #bfdbfe",
                padding: "8px 12px",
                borderRadius: 999,
                fontWeight: 700,
              }}
            >
              MD 자료 기반
            </div>
          </header>

          <div style={{ flex: 1, overflowY: "auto", padding: 26 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    maxWidth: m.role === "user" ? "64%" : "72%",
                    padding: "16px 18px",
                    borderRadius:
                      m.role === "user"
                        ? "22px 22px 6px 22px"
                        : "22px 22px 22px 6px",
                    background:
                      m.role === "user"
                        ? "linear-gradient(135deg, #2563eb, #7c3aed)"
                        : "#f8fafc",
                    color: m.role === "user" ? "white" : "#0f172a",
                    border: m.role === "assistant" ? "1px solid #e2e8f0" : "none",
                    lineHeight: 1.85,
                    fontSize: 15.5,
                    boxShadow:
                      m.role === "user"
                        ? "0 14px 32px rgba(37,99,235,0.22)"
                        : "0 12px 30px rgba(15,23,42,0.06)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 8,
                      color: m.role === "user" ? "rgba(255,255,255,0.78)" : "#64748b",
                    }}
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
              <div
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "13px 16px",
                  borderRadius: 18,
                  color: "#64748b",
                  fontSize: 14,
                }}
              >
                자료 확인 중...
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <footer
            style={{
              padding: 18,
              borderTop: "1px solid #e2e8f0",
              background: "rgba(248,250,252,0.95)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                background: "white",
                border: "1px solid #cbd5e1",
                borderRadius: 20,
                padding: 10,
                boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
              }}
            >
              <input
                value={input}
                disabled={loading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder="예: 컴퓨터공학과 가려면 어떤 과목 들어야 해?"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: 15,
                  padding: "12px 14px",
                  color: "#0f172a",
                  background: "transparent",
                }}
              />

              <button
                onClick={() => sendMessage()}
                disabled={loading}
                style={{
                  border: "none",
                  borderRadius: 15,
                  padding: "0 24px",
                  background: loading ? "#94a3b8" : "#2563eb",
                  color: "white",
                  fontWeight: 900,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "대기" : "전송"}
              </button>
            </div>
          </footer>
        </section>
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
          margin: 5px 0;
        }

        .markdown-body strong {
          font-weight: 800;
        }

        .markdown-body h1,
        .markdown-body h2,
        .markdown-body h3 {
          font-size: 16px;
          margin: 14px 0 8px 0;
        }

        .markdown-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 14px;
          overflow: hidden;
          border-radius: 12px;
        }

        .markdown-body th,
        .markdown-body td {
          border: 1px solid #cbd5e1;
          padding: 9px 10px;
          text-align: left;
        }

        .markdown-body th {
          background: #eff6ff;
          font-weight: 800;
        }

        @media (max-width: 900px) {
          main > div {
            grid-template-columns: 1fr !important;
          }

          aside {
            position: static !important;
            height: auto !important;
          }

          section {
            height: 75vh !important;
          }
        }
      `}</style>
    </main>
  );
}