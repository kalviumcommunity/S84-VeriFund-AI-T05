import os
import sys
from app.db.session import SessionLocal
from app.models.document import Document
from app.services.ingestion import ingestion_service

def main():
    db = SessionLocal()
    try:
        docs = db.query(Document).all()
        print(f"Found {len(docs)} documents in database:")
        for doc in docs:
            print(f"- {doc.title} (ID: {doc.id})")
            # Determine local file path
            local_path = None
            if os.path.exists(f"uploads/{doc.title}.pdf"):
                local_path = f"uploads/{doc.title}.pdf"
            elif os.path.exists(doc.file_url):
                local_path = doc.file_url
            
            if not local_path:
                print(f"  Warning: No local file found for {doc.title}")
                continue
                
            print(f"  Re-ingesting from {local_path}...")
            success = ingestion_service.process_pdf(
                file_path=local_path,
                document_id=str(doc.id),
                db=db
            )
            print(f"  Ingestion result for {doc.title}: {'SUCCESS' if success else 'FAILED'}")
            
    finally:
        db.close()

if __name__ == "__main__":
    import traceback
    try:
        main()
    except Exception as e:
        traceback.print_exc()
