"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "컴퓨터공학과",
  "경영학과",
  "5등급제가 뭐야?",
  "고교학점제가 뭐야?",
  "물리학",
  "생명과학",

];

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "안녕하세요. 진로, 학과, 선택과목에 대해 질문해보세요.\n자료를 참고해서 핵심 위주로 정리해드릴게요.",
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
        {
          role: "assistant",
          content: data.reply || "답변을 생성하지 못했어요.",
        },
      ]);
    } catch {
      setMessages([
        ...updated,
        {
          role: "assistant",
          content: "오류가 발생했어요. 서버 상태를 확인해주세요.",
        },
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
          "radial-gradient(circle at top left, #26345f 0, #111827 35%, #080b12 100%)",
        color: "#f8fafc",
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
          gridTemplateColumns: "320px 1fr",
          gap: 24,
        }}
      >
        {/* 왼쪽 패널 */}
        <aside
          style={{
            background: "rgba(15, 23, 42, 0.82)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 28,
            padding: 24,
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            height: "calc(100vh - 48px)",
            position: "sticky",
            top: 24,
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              background: "linear-gradient(135deg, #60a5fa, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              marginBottom: 18,
            }}
          >
            🎓
          </div>

          <h1 style={{ fontSize: 28, lineHeight: 1.25, margin: 0 }}>
            AI 진로·과목
            <br />
            설계 도우미
          </h1>

          <p
            style={{
              color: "#aab3c5",
              fontSize: 14,
              lineHeight: 1.7,
              marginTop: 14,
              marginBottom: 26,
            }}
          >
            2022 개정 교육과정, 대학 권장과목, 학교 선택과목 자료를 바탕으로
            진로와 과목 선택을 도와줍니다.
          </p>

          <div
            style={{
              padding: 14,
              borderRadius: 18,
              background: "rgba(96,165,250,0.10)",
              border: "1px solid rgba(96,165,250,0.18)",
              marginBottom: 22,
              fontSize: 13,
              color: "#cbd5e1",
              lineHeight: 1.6,
            }}
          >
            질문 예시를 누르거나 직접 입력해보세요.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={loading}
                style={{
                  textAlign: "left",
                  padding: "13px 14px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.045)",
                  color: "#e5e7eb",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 14,
                  opacity: loading ? 0.55 : 1,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </aside>

        {/* 채팅 영역 */}
        <section
          style={{
            background: "rgba(15, 23, 42, 0.72)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 28,
            height: "calc(100vh - 48px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          }}
        >
          <header
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>상담 채팅</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                질문은 짧게 입력해도 괜찮아요.
              </div>
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#cbd5e1",
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.2)",
                padding: "8px 12px",
                borderRadius: 999,
              }}
            >
              PDF 기반 응답
            </div>
          </header>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 24,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    m.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    maxWidth: m.role === "user" ? "70%" : "78%",
                    padding: "15px 18px",
                    borderRadius:
                      m.role === "user"
                        ? "20px 20px 6px 20px"
                        : "20px 20px 20px 6px",
                    background:
                      m.role === "user"
                        ? "linear-gradient(135deg, #4f7cff, #7c5cff)"
                        : "rgba(30, 41, 59, 0.95)",
                    color: "#f8fafc",
                    lineHeight: 1.75,
                    fontSize: 15.5,
                    boxShadow:
                      m.role === "user"
                        ? "0 12px 30px rgba(79,124,255,0.25)"
                        : "0 12px 30px rgba(0,0,0,0.20)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color:
                        m.role === "user"
                          ? "rgba(255,255,255,0.75)"
                          : "#9ca3af",
                      marginBottom: 6,
                      fontWeight: 800,
                    }}
                  >
                    {m.role === "user" ? "나" : "AI 상담사"}
                  </div>

                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(30,41,59,0.9)",
                  padding: "12px 16px",
                  borderRadius: 16,
                  color: "#cbd5e1",
                  fontSize: 14,
                }}
              >
                <span>자료를 확인하고 있어요</span>
                <span>...</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <footer
            style={{
              padding: 18,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(2,6,23,0.45)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 20,
                padding: 10,
              }}
            >
              <input
                value={input}
                disabled={loading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder="예: 컴퓨터공학과 가려면 어떤 과목을 골라야 해?"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "white",
                  fontSize: 15,
                  padding: "12px 14px",
                }}
              />

              <button
                onClick={() => sendMessage()}
                disabled={loading}
                style={{
                  border: "none",
                  borderRadius: 16,
                  padding: "0 24px",
                  background: loading
                    ? "#64748b"
                    : "linear-gradient(135deg, #ffffff, #dbeafe)",
                  color: "#0f172a",
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
    </main>
  );
}