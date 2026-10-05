import sys
from app.db.session import SessionLocal
from app.models.document_chunk import DocumentChunk
from app.models.document import Document
from collections import Counter

db = SessionLocal()
try:
    docs = db.query(Document).all()
    print("Documents:")
    for d in docs:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == str(d.id)).all()
        pages = Counter([c.page_number for c in chunks])
        print(f"  {d.title} (ID: {d.id}): {len(chunks)} chunks across {len(pages)} distinct pages")
        print(f"    Page sample: {sorted(pages.keys())[:10]} ... {sorted(pages.keys())[-3:]}")
finally:
    db.close()
