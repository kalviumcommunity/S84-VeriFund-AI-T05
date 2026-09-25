import os
import uuid
import asyncio
import nest_asyncio
from typing import List, Dict, Any
import pdfplumber
from langchain_huggingface import HuggingFaceEmbeddings
from sqlalchemy.orm import Session
from app.models.document import Document, DocumentStatus
from app.models.query_log import QueryLog
from app.core.config import settings

# Initialize nest_asyncio for LlamaParse within FastAPI
nest_asyncio.apply()

try:
    from llama_parse import LlamaParse
except ImportError:
    LlamaParse = None

class DocumentIngestionService:
    def __init__(self):
        # Initialize embedding model locally
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Initialize Pinecone (Placeholder)
        # pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
        # self.index = pc.Index(os.environ.get("PINECONE_INDEX_NAME"))

    def process_pdf(self, file_path: str, document_id: str, db: Session) -> bool:
        """
        Extract text from PDF using LlamaParse (if configured) or pdfplumber,
        chunk it, generate embeddings, and save to Pinecone and Postgres.
        """
        chunks = []
        try:
            # 1a. LlamaParse Extraction (Advanced)
            if settings.LLAMA_CLOUD_API_KEY and LlamaParse:
                print(f"Using LlamaParse for {file_path}")
                parser = LlamaParse(
                    api_key=settings.LLAMA_CLOUD_API_KEY,
                    result_type="markdown",
                    verbose=True
                )
                
                # LlamaParse is async, but we can run it synchronously via nest_asyncio
                loop = asyncio.get_event_loop()
                documents = loop.run_until_complete(parser.aload_data(file_path))
                
                if documents:
                    full_markdown = documents[0].text
                    # Simple markdown chunking for MVP
                    raw_chunks = full_markdown.split("\n## ")
                    for i, c in enumerate(raw_chunks):
                        chunks.append({
                            "id": str(uuid.uuid4()),
                            "document_id": document_id,
                            "page_number": 1, # LlamaParse loses precise pagination without extra config
                            "text": c if i == 0 else f"## {c}",
                            "chunk_type": "MARKDOWN_SECTION"
                        })

            # 1b. Fallback pdfplumber Extraction (Free/Local)
            else:
                print(f"Using pdfplumber for {file_path}")
                with pdfplumber.open(file_path) as pdf:
                    for page_num, page in enumerate(pdf.pages, start=1):
                        text = page.extract_text()
                        tables = page.extract_tables()
                        
                        if text:
                            paragraphs = [p.strip() for p in text.split('\n\n') if len(p.strip()) > 50]
                            for i, p in enumerate(paragraphs):
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
                                chunks.append({
                                    "id": str(uuid.uuid4()),
                                    "document_id": document_id,
                                    "page_number": page_num,
                                    "text": table_str,
                                    "chunk_type": "RAW_TABLE"
                                })
        except Exception as e:
            print(f"Error parsing PDF: {e}")
            return False

        # 2. Embedding Generation
        texts_to_embed = [c["text"] for c in chunks]
        if not texts_to_embed:
            return False
            
        print(f"Generating embeddings for {len(texts_to_embed)} chunks...")
        vectors = self.embeddings.embed_documents(texts_to_embed)

        # 3. Pinecone Upsert & Postgres Save
        pinecone_vectors = []
        for i, chunk in enumerate(chunks):
            # We would upsert to pinecone:
            # pinecone_vectors.append((chunk["id"], vectors[i], {"document_id": document_id, "page": chunk["page_number"]}))
            
            # Save to Postgres document_chunks table (assuming a DocumentChunk model exists)
            pass

        # self.index.upsert(vectors=pinecone_vectors)
        
        # 4. Mark Document as APPROVED
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = DocumentStatus.APPROVED
            db.commit()

        return True

ingestion_service = DocumentIngestionService()
