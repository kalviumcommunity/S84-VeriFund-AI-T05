import os
import uuid
import asyncio
from typing import List, Dict, Any
import pdfplumber
from sqlalchemy.orm import Session
from app.services.retrieval import rag_service
from app.models.document import Document, DocumentStatus
from app.models.query_log import QueryLog
from app.models.document_chunk import DocumentChunk
from app.core.config import settings
from pinecone import Pinecone

try:
    from llama_parse import LlamaParse
except ImportError:
    LlamaParse = None

class DocumentIngestionService:
    def __init__(self):
        # Use shared Pinecone index to save memory
        self.index = rag_service.index
        
    @property
    def embeddings(self):
        return rag_service.embeddings

    def process_pdf(self, file_path: str, document_id: str, db: Session) -> bool:
        """
        Extract text from PDF using LlamaParse (if configured) or pdfplumber,
        chunk it, generate embeddings, and save to Pinecone and Postgres.
        """
        chunks = []
        # Apply nest_asyncio removed to prevent NoEventLoopError on subsequent requests
        print(f"Extracting PDF pages with pdfplumber for {file_path}")
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                tables = page.extract_tables() or []
                
                clean_text = text.strip()
                if clean_text:
                    # Split by double newline if paragraphs exist, or by ~1000 char blocks
                    raw_paragraphs = [p.strip() for p in clean_text.split('\n\n') if len(p.strip()) > 30]
                    paragraphs = []
                    for p in raw_paragraphs:
                        if len(p) > 1200:
                            sub = [p[i:i+1000] for i in range(0, len(p), 900)]
                            paragraphs.extend(sub)
                        else:
                            paragraphs.append(p)
                            
                    if not paragraphs and len(clean_text) > 30:
                        paragraphs = [clean_text[i:i+1000] for i in range(0, len(clean_text), 900)]
                        
                    for p in paragraphs:
                        chunks.append({
                            "id": str(uuid.uuid4()),
                            "document_id": document_id,
                            "page_number": page_num,
                            "text": p,
                            "chunk_type": "LEAF_PARAGRAPH"
                        })
                
                for t_idx, table in enumerate(tables):
                    if table:
                        table_str = "\n".join([" | ".join(str(cell) if cell else "" for cell in row) for row in table])
                        if len(table_str.strip()) > 20:
                            chunks.append({
                                "id": str(uuid.uuid4()),
                                "document_id": document_id,
                                "page_number": page_num,
                                "text": table_str,
                                "chunk_type": "RAW_TABLE"
                            })

        # 1.5 Contextual Enrichment
        doc = db.query(Document).filter(Document.id == document_id).first()
        enrichment_prefix = ""
        if doc:
            enrichment_prefix = f"Document: {doc.title}\nAsset Class: {doc.asset_class}\nDate: {doc.effective_date}\n---\n"
            
        for chunk in chunks:
            chunk["text"] = enrichment_prefix + chunk["text"]

        # 2. Embedding Generation
        texts_to_embed = [c["text"] for c in chunks]
        if not texts_to_embed:
            return False
            
        print(f"Generating embeddings for {len(texts_to_embed)} chunks...")
        vectors = []
        batch_size = 16
        for idx in range(0, len(texts_to_embed), batch_size):
            batch = texts_to_embed[idx : idx + batch_size]
            batch_vectors = self.embeddings.embed_documents(batch)
            vectors.extend(batch_vectors)

        # 3. Pinecone Upsert & Postgres Save
        # Clean existing chunks to prevent duplicates
        db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete(synchronize_session=False)

        pinecone_vectors = []
        for i, chunk in enumerate(chunks):
            if self.index:
                pinecone_vectors.append((chunk["id"], vectors[i], {"document_id": document_id, "page": chunk["page_number"]}))
            
            db_chunk = DocumentChunk(
                id=chunk["id"],
                document_id=document_id,
                chunk_type=chunk["chunk_type"],
                content=chunk["text"],
                page_number=chunk["page_number"]
            )
            db.add(db_chunk)

        if self.index and pinecone_vectors:
            for b in range(0, len(pinecone_vectors), 100):
                self.index.upsert(vectors=pinecone_vectors[b:b+100])
        
        # 4. Mark Document as APPROVED
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = DocumentStatus.APPROVED
            db.commit()

        return True

ingestion_service = DocumentIngestionService()
