import pdfplumber
import json
import os

files = [
    ("고등학교 과목 안내서", "pdf1.pdf.pdf"),
    ("대학 권장과목", "pdf2.pdf.pdf")
    # 3번 PDF는 너무 느리거나 안 읽히면 일단 제외
    # ("학교 가이드북", "pdf3.pdf.pdf")
]

chunks = []

MAX_PAGES = 300  # 일단 테스트용. 전체 하려면 None으로 바꾸기
# MAX_PAGES = None

for name, file in files:
    print(f"\n📘 처리 시작: {file}")

    try:
        with pdfplumber.open(file) as pdf:
            total = len(pdf.pages)

            for i, page in enumerate(pdf.pages):
                if MAX_PAGES is not None and i >= MAX_PAGES:
                    print(f"⚠️ {file}: {MAX_PAGES}페이지까지만 처리하고 중단")
                    break

                print(f"{file} / {i+1}/{total} 페이지 처리 중")

                try:
                    text = page.extract_text(
                        x_tolerance=1,
                        y_tolerance=1
                    )
                except Exception as e:
                    print(f"❌ {i+1}페이지 오류 → 건너뜀")
                    continue

                if not text or len(text.strip()) < 50:
                    continue

                chunks.append({
                    "source": name,
                    "page": i + 1,
                    "title": f"{name} p.{i+1}",
                    "keywords": [],
                    "content": text.strip()
                })

    except Exception as e:
        print(f"❌ 파일 오류: {file}")
        print(e)

os.makedirs("data", exist_ok=True)

with open("data/chunks.json", "w", encoding="utf-8") as f:
    json.dump(chunks, f, ensure_ascii=False, indent=2)

print(f"\n✅ 완료! 총 {len(chunks)}개 chunk 생성")
print("📁 저장 위치: data/chunks.json")