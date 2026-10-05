from typing import List, Dict, Any
from sqlalchemy.orm import Session
from pinecone import Pinecone
from app.core.config import settings
from app.models.document_chunk import DocumentChunk
from app.models.document import Document


class GeminiEmbeddings:
    """
    Lightweight API-based embeddings using Google's text-embedding-004 model.
    Uses no local RAM - just HTTP calls to Google's API.
    Outputs 384-dimensional vectors to stay compatible with the Pinecone index.
    """
    EMBEDDING_MODEL = "models/embedding-001"
    OUTPUT_DIM = 384

    def __init__(self, api_key: str):
        from google import genai
        self.client = genai.Client(api_key=api_key)

    def embed_query(self, text: str) -> List[float]:
        result = self.client.models.embed_content(
            model=self.EMBEDDING_MODEL,
            contents=text,
            config={"output_dimensionality": self.OUTPUT_DIM}
        )
        return result.embeddings[0].values

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        embeddings = []
        for text in texts:
            result = self.client.models.embed_content(
                model=self.EMBEDDING_MODEL,
                contents=text,
                config={"output_dimensionality": self.OUTPUT_DIM}
            )
            embeddings.append(result.embeddings[0].values)
        return embeddings


class RagService:
    def __init__(self):
        self._embeddings = None
        if settings.PINECONE_API_KEY:
            pc = Pinecone(api_key=settings.PINECONE_API_KEY)
            self.index = pc.Index(settings.PINECONE_INDEX_NAME)
        else:
            self.index = None

    @property
    def embeddings(self):
        if self._embeddings is None:
            self._embeddings = GeminiEmbeddings(api_key=settings.GEMINI_API_KEY)
        return self._embeddings

    def retrieve_chunks(
        self, 
        query: str, 
        db: Session, 
        top_k: int = 5, 
        document_ids: List[str] = None,
        is_summary: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top K chunks from Pinecone, expands their context, re-ranks them, and fetches full text.
        If is_summary is True, samples chunks across the breadth of the document's pages.
        """
        expanded_candidates = []

        if self.index:
            try:
                # 1. Embed query and over-fetch from Pinecone
                query_vector = self.embeddings.embed_query(query)
                query_kwargs = {
                    "vector": query_vector,
                    "top_k": max(top_k * 3, 15),
                    "include_metadata": True
                }
                if document_ids:
                    query_kwargs["filter"] = {"document_id": {"$in": document_ids}}
                    
                results = self.index.query(**query_kwargs)
                
                if results and results.matches:
                    # 2. Extract IDs and fetch from Postgres
                    chunk_ids = [match.id for match in results.matches]
                    db_chunks = db.query(DocumentChunk, Document).join(
                        Document, DocumentChunk.document_id == Document.id
                    ).filter(DocumentChunk.id.in_(chunk_ids)).all()
                    
                    chunk_map = {str(chunk.id): (chunk, doc) for chunk, doc in db_chunks}
                    
                    # 3. Context Expansion (Fetch adjacent page chunks)
                    seen_pages = set()
                    for match in results.matches:
                        if match.id in chunk_map:
                            chunk, doc = chunk_map[match.id]
                            page_key = f"{doc.id}_{chunk.page_number}"
                            if page_key not in seen_pages:
                                seen_pages.add(page_key)
                                page_chunks = db.query(DocumentChunk).filter(
                                    DocumentChunk.document_id == doc.id,
                                    DocumentChunk.page_number == chunk.page_number
                                ).order_by(DocumentChunk.id).all()
                                
                                full_text = "\n\n".join([c.content for c in page_chunks])
                                expanded_candidates.append({
                                    "chunk_id": str(chunk.id),
                                    "document_title": doc.title,
                                    "asset_class": getattr(doc, 'asset_class', 'Unknown'),
                                    "page_number": chunk.page_number,
                                    "snippet": full_text,
                                    "original_score": match.score
                                })
            except Exception as e:
                print(f"Error querying vector index: {e}")

        # If summarization is requested and we have document_ids, ensure multi-page spread
        if is_summary and document_ids:
            all_chunks = db.query(DocumentChunk, Document).join(
                Document, DocumentChunk.document_id == Document.id
            ).filter(DocumentChunk.document_id.in_(document_ids)).order_by(DocumentChunk.page_number).all()

            pages_dict = {}
            for chunk, doc in all_chunks:
                if chunk.page_number not in pages_dict:
                    pages_dict[chunk.page_number] = (chunk, doc)

            sorted_pages = sorted(pages_dict.keys())
            if len(sorted_pages) > top_k:
                step = len(sorted_pages) / top_k
                sampled_pages = [sorted_pages[int(i * step)] for i in range(top_k)]
            else:
                sampled_pages = sorted_pages

            summary_candidates = []
            for p_num in sampled_pages:
                chunk, doc = pages_dict[p_num]
                page_chunks = db.query(DocumentChunk).filter(
                    DocumentChunk.document_id == doc.id,
                    DocumentChunk.page_number == p_num
                ).order_by(DocumentChunk.id).all()
                full_text = "\n\n".join([c.content for c in page_chunks])
                summary_candidates.append({
                    "chunk_id": str(chunk.id),
                    "document_title": doc.title,
                    "asset_class": getattr(doc, 'asset_class', 'Unknown'),
                    "page_number": p_num,
                    "snippet": full_text,
                    "original_score": 1.0
                })

            # Merge: take semantic matches first, fill remaining slots with spread pages
            merged = []
            seen_p = set()
            for c in expanded_candidates:
                if c["page_number"] not in seen_p:
                    seen_p.add(c["page_number"])
                    merged.append(c)

            for c in summary_candidates:
                if c["page_number"] not in seen_p:
                    seen_p.add(c["page_number"])
                    merged.append(c)

            return merged[:top_k]

        # Standard mode: sort by original dense score
        expanded_candidates.sort(key=lambda x: x.get("original_score", 0), reverse=True)
        return expanded_candidates[:top_k]

rag_service = RagService()
