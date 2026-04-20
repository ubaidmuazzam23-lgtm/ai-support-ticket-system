# File: backend/app/services/knowledge_service.py
#
# RAG pipeline — ChromaDB + sentence-transformers
# Install: pip install chromadb sentence-transformers pypdf2
#
# Used in 3 places:
#   1. Admin/Engineer upload → chunk → embed → store
#   2. Chat service → search on user message → pass context to Claude
#   3. Engineer dashboard → ticket similarity with knowledge base

import os
import uuid
import json
from datetime import datetime
from typing import Optional, List

CHROMA_DIR     = os.path.join(os.path.dirname(__file__), "..", "..", "data", "knowledge_base")
DOCS_META_PATH = os.path.join(CHROMA_DIR, "documents_meta.json")
os.makedirs(CHROMA_DIR, exist_ok=True)

# ── Singletons ────────────────────────────────────────────────────────────────
_collection = None
_embedder   = None


def _get_collection():
    global _collection
    if _collection is None:
        try:
            import chromadb
            client = chromadb.PersistentClient(path=CHROMA_DIR)
            _collection = client.get_or_create_collection(
                name="nexusdesk_knowledge",
                metadata={"hnsw:space": "cosine"},
            )
        except ImportError:
            raise RuntimeError("chromadb not installed. Run: pip install chromadb")
    return _collection


def _get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        except ImportError:
            raise RuntimeError("sentence-transformers not installed.")
    return _embedder


# ── Text extraction ───────────────────────────────────────────────────────────

def _extract_text(content: bytes, filename: str) -> str:
    if filename.lower().endswith(".pdf"):
        for lib in ["PyPDF2", "pypdf"]:
            try:
                mod = __import__(lib)
                import io
                reader = mod.PdfReader(io.BytesIO(content))
                return "\n".join(p.extract_text() or "" for p in reader.pages)
            except (ImportError, Exception):
                continue
    return content.decode("utf-8", errors="ignore")


def _chunk_text(text: str, chunk_size: int = 400, overlap: int = 60) -> List[str]:
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk.strip())
        i += chunk_size - overlap
    return chunks


# ── Metadata store ────────────────────────────────────────────────────────────

def _load_meta() -> dict:
    if os.path.exists(DOCS_META_PATH):
        with open(DOCS_META_PATH) as f:
            return json.load(f)
    return {}


def _save_meta(meta: dict):
    with open(DOCS_META_PATH, "w") as f:
        json.dump(meta, f, indent=2)


# ── Upload ────────────────────────────────────────────────────────────────────

def upload_document(
    content: bytes,
    filename: str,
    title: str,
    domain: str,
    description: str,
    uploaded_by: str,
    uploaded_by_role: str = "admin",
) -> dict:
    text = _extract_text(content, filename)
    if not text.strip():
        return {"success": False, "error": "Could not extract text from document"}

    chunks     = _chunk_text(text)
    embedder   = _get_embedder()
    embeddings = embedder.encode(chunks).tolist()
    collection = _get_collection()

    doc_id    = str(uuid.uuid4())
    ids       = [f"{doc_id}_{i}" for i in range(len(chunks))]
    metadatas = [
        {"doc_id": doc_id, "domain": domain, "title": title, "chunk_index": i}
        for i in range(len(chunks))
    ]

    collection.add(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)

    meta = _load_meta()
    meta[doc_id] = {
        "id":               doc_id,
        "title":            title,
        "filename":         filename,
        "domain":           domain,
        "description":      description,
        "uploaded_by":      uploaded_by,
        "uploaded_by_role": uploaded_by_role,
        "chunk_count":      len(chunks),
        "created_at":       datetime.utcnow().isoformat(),
    }
    _save_meta(meta)

    print(f"\n  📚 KB Upload: '{title}' — {len(chunks)} chunks [{uploaded_by_role}]")
    return {
        "success":     True,
        "doc_id":      doc_id,
        "title":       title,
        "chunk_count": len(chunks),
        "message":     f"'{title}' indexed — {len(chunks)} chunks.",
    }


# ── Search ────────────────────────────────────────────────────────────────────

def search_knowledge(
    query: str,
    n_results: int = 5,
    domain: Optional[str] = None,
) -> dict:
    try:
        collection = _get_collection()
        total = collection.count()
        if total == 0:
            return {"query": query, "results": [], "total": 0}

        embedder        = _get_embedder()
        query_embedding = embedder.encode([query]).tolist()
        where           = {"domain": domain} if domain and domain not in ("", "other", "all") else None

        results = collection.query(
            query_embeddings=query_embedding,
            n_results=min(n_results, total),
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        hits = []
        meta = _load_meta()
        if results["documents"] and results["documents"][0]:
            for doc, metadata, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            ):
                doc_id   = metadata.get("doc_id", "")
                doc_meta = meta.get(doc_id, {})
                hits.append({
                    "content":          doc,
                    "title":            metadata.get("title", doc_meta.get("title", "Unknown")),
                    "doc_id":           doc_id,
                    "domain":           metadata.get("domain", "other"),
                    "cosine_similarity": round((1 - dist) * 100, 1),
                    "filename":         doc_meta.get("filename", ""),
                    "description":      doc_meta.get("description", ""),
                })

        return {"query": query, "results": hits, "total": len(hits)}

    except Exception as e:
        print(f"  ⚠ KB search error: {e}")
        return {"query": query, "results": [], "total": 0, "error": str(e)}


# ── Ticket similarity (for engineer dashboard) ────────────────────────────────

def get_similar_docs_for_ticket(
    query: str,
    domain: Optional[str] = None,
    n_results: int = 5,
) -> dict:
    """
    Returns knowledge base documents most similar to the ticket.
    Includes cosine similarity score for each result.
    """
    result = search_knowledge(query=query, n_results=n_results, domain=domain)
    # Also try without domain filter for broader results
    if result["total"] < 2 and domain:
        broader = search_knowledge(query=query, n_results=n_results)
        if broader["total"] > result["total"]:
            result = broader
    return result


# ── RAG context for chat (called from chat_service) ───────────────────────────

def get_rag_context(query: str, domain: Optional[str] = None, n_results: int = 3) -> str:
    """
    Returns formatted RAG context string to inject into Claude's prompt.
    Returns empty string if no relevant docs found or KB is empty.
    """
    try:
        result = search_knowledge(query=query, n_results=n_results, domain=domain)
        hits   = [r for r in result.get("results", []) if r["cosine_similarity"] >= 45]
        if not hits:
            return ""

        print("\n  📖 RAG Context Injected:")
        print("  " + chr(9472)*52)
        for i, hit in enumerate(hits[:3], 1):
            title    = hit["title"]
            filename = hit["filename"]
            domain   = hit["domain"]
            sim      = hit["cosine_similarity"]
            print(f"  [{i}] {title}")
            print(f"      File      : {filename}")
            print(f"      Domain    : {domain}")
            print(f"      Similarity: {sim}%")
        print("  " + chr(9472)*52 + "\n")

        context = "\n\n--- Relevant Knowledge Base Articles ---\n"
        for i, hit in enumerate(hits[:3], 1):
            context += f"\n[{i}] {hit['title']} (relevance: {hit['cosine_similarity']}%)\n"
            context += hit["content"][:400] + "...\n"
        context += "\n--- End Knowledge Base ---\n"
        return context

    except Exception:
        return ""


# ── List / Delete ─────────────────────────────────────────────────────────────

def list_documents(domain: Optional[str] = None) -> list:
    meta = _load_meta()
    docs = list(meta.values())
    if domain and domain not in ("all", ""):
        docs = [d for d in docs if d.get("domain") == domain]
    return sorted(docs, key=lambda x: x.get("created_at", ""), reverse=True)


def delete_document(doc_id: str) -> bool:
    meta = _load_meta()
    if doc_id not in meta:
        return False
    try:
        collection = _get_collection()
        results    = collection.get(where={"doc_id": doc_id})
        if results["ids"]:
            collection.delete(ids=results["ids"])
    except Exception as e:
        print(f"  ⚠ KB delete error: {e}")
    del meta[doc_id]
    _save_meta(meta)
    print(f"\n  🗑 KB: deleted {doc_id}")
    return True