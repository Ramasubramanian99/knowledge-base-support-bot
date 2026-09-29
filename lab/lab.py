"""Example: load test_document.pdf, chunk it, embed it with Gemini via
LangChain, and then retrieves it.
"""

import math
import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

load_dotenv()

# 1. Load the PDF: one Document per page
PDF_PATH = Path(__file__).parent / "test_document.pdf"

reader = PdfReader(PDF_PATH)
docs = [
    Document(
        page_content=page.extract_text(),
        metadata={"source": PDF_PATH.name, "page": i + 1},
    )
    for i, page in enumerate(reader.pages)
]

# 2. Split into chunks 
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
chunks = splitter.split_documents(docs)

# 3. Embed 
embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    output_dimensionality=768,
)

texts = [c.page_content for c in chunks]
vectors = embeddings.embed_documents(texts)

vector_store = [
    {"content": chunk.page_content, "metadata": chunk.metadata, "embedding": vec}
    for chunk, vec in zip(chunks, vectors)
]

print(f"Embedded {len(vector_store)} chunks, dim={len(vector_store[0]['embedding'])}")
for row in vector_store:
    print(f"{row['metadata']['source']} p{row['metadata']['page']}", "->", row["embedding"][:5], "...")

# 4. Retrieval
def cosine_similarity(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))


def retrieve(question, k=3):
    query_vec = embeddings.embed_query(question)
    ranked = sorted(
        vector_store,
        key=lambda row: cosine_similarity(query_vec, row["embedding"]),
        reverse=True,
    )
    return ranked[:k]


llm = ChatGoogleGenerativeAI(
    model="gemini-3.6-flash",
    google_api_key=os.getenv("GEMINI_API_KEY"),
)

question = "What is the annual maximum for dental?"
top_chunks = retrieve(question)


# 5. Build context and generate response
context = "\n\n".join(
    f"[{row['metadata']['source']} p{row['metadata']['page']}]\n{row['content']}"
    for row in top_chunks
)

messages = [
    (
        "system",
        "You are a customer service assistant. Answer using only the context "
        "below. If the answer is not in the context, say you don't know. "
        "Cite the page you used.\n\nContext:\n" + context,
    ),
    ("human", question),
]

answer = llm.invoke(messages)
print("\nQ:", question)
print("A:", answer.text)
