export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?!.]/g, " ")
    .trim();
}

export function splitSections(doc: string) {
  return doc
    .split(/\n(?=#{1,4}\s|---|\*\*[^*]+\*\*)/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 40);
}

export function searchRelevant(query: string, doc: string, limit = 8) {
  const q = normalize(query);
  const words = q.split(" ").filter((w) => w.length >= 2);
  const sections = splitSections(doc);

  return sections
    .map((section) => {
      const text = normalize(section);
      const firstLine = normalize(section.split("\n")[0] || "");

      let score = 0;

      if (firstLine.includes(q)) score += 100;
      if (text.includes(q)) score += 50;

      for (const word of words) {
        if (firstLine.includes(word)) score += 20;
        if (text.includes(word)) score += 5;
      }

      return { section, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.section)
    .join("\n\n---\n\n");
}

export function extractOpenedSubjects(subjectDoc: string) {
  const subjects = new Set<string>();

  const boldMatches = subjectDoc.matchAll(/\*\*([^*\n]+)\*\*/g);

  for (const match of boldMatches) {
    const name = match[1].trim();

    if (
      name.length <= 20 &&
      !name.includes(":") &&
      !name.includes("추천") &&
      !name.includes("관련") &&
      !name.includes("핵심") &&
      !name.includes("소개")
    ) {
      subjects.add(name);
    }
  }

  return Array.from(subjects);
}

export function filterSubjectsFromText(text: string, allowedSubjects: string[]) {
  return allowedSubjects.filter((subject) => text.includes(subject));
}