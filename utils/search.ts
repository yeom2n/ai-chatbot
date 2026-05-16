type SearchResult = {
  section: string;
  score: number;
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?!.]/g, " ")
    .trim();
}

function getKeywords(query: string) {
  return normalize(query)
    .split(" ")
    .filter((word) => word.length >= 2);
}

export function searchRelevant(query: string, docs: string) {
  const q = normalize(query);
  const keywords = getKeywords(query);

  const sections = docs
    .split(/\n(?=#{1,4}\s|####\s|\*\*.+\*\*)/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 30);

  const results: SearchResult[] = sections.map((section) => {
    const text = normalize(section);
    const firstLine = normalize(section.split("\n")[0] || "");

    let score = 0;

    // 제목에 질문이 직접 들어가면 강한 가중치
    if (firstLine.includes(q)) score += 80;
    if (text.includes(q)) score += 40;

    for (const word of keywords) {
      if (firstLine.includes(word)) score += 20;
      if (text.includes(word)) score += 5;
    }

    return { section, score };
  });

  const filtered = results
    .filter((r) => r.score >= 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return filtered.map((r) => r.section).join("\n\n---\n\n");
}