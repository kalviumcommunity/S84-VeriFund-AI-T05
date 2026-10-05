from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any
import shutil
import os
import uuid
from datetime import datetime
import boto3

from app.api.dependencies import get_db
from app.schemas.document import DocumentResponse, DocumentCreate
from app.models.document import Document, DocumentStatus
from app.services.ingestion import ingestion_service
from app.core.config import settings

import threading
import queue

# Create a strict sequential queue for processing PDFs to prevent OOM kills
# on low-memory Render instances when batch-uploading documents.
upload_queue = queue.Queue()

def _ingestion_worker():
    while True:
        task = upload_queue.get()
        if task is None: break
        try:
            # task is a tuple of (file_path, document_id)
            ingestion_service.process_pdf(task[0], task[1])
        except Exception as e:
            print(f"Ingestion worker failed: {e}")
        finally:
            upload_queue.task_done()

# Start the daemon worker thread
threading.Thread(target=_ingestion_worker, daemon=True).start()

router = APIRouter()

def get_s3_client():
    if not settings.AWS_ACCESS_KEY_ID:
        return None
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_ENDPOINT_URL_S3,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )

@router.post("/upload", response_model=DocumentResponse)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
) -> Any:
    """
    Upload PDF to Neon S3 and trigger ingestion in the background.
    """
    # 1. Save file locally (temp for processing)
    os.makedirs("uploads", exist_ok=True)
    local_file_path = f"uploads/{file.filename}"
    with open(local_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    s3_client = get_s3_client()
    file_url = local_file_path
    
    if s3_client:
        bucket_name = "pdf"
        s3_key = f"{uuid.uuid4()}_{file.filename}"
        s3_client.upload_file(local_file_path, bucket_name, s3_key)
        file_url = f"s3://{bucket_name}/{s3_key}"
        
    # 2. Create DB Record
    new_doc = Document(
        title=file.filename.replace(".pdf", ""),
        file_url=file_url,
        status=DocumentStatus.DRAFT,
        version="1.0",
        asset_class="Unknown",
        effective_date=datetime.now()
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    # 3. Trigger Ingestion via Sequential Worker Queue
    upload_queue.put((local_file_path, str(new_doc.id)))
    
    return new_doc

@router.get("/{id}/url")
def get_document_url(id: str, db: Session = Depends(get_db)):
    """
    Get a secure presigned URL for the document.
    """
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(404, "Not found")
    
    if doc.file_url.startswith("s3://"):
        parts = doc.file_url.replace("s3://", "").split("/")
        bucket = parts[0]
        key = "/".join(parts[1:])
        s3_client = get_s3_client()
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket, 
                'Key': key,
                'ResponseContentType': 'application/pdf',
                'ResponseContentDisposition': 'inline'
            },
            ExpiresIn=3600
        )
        return {"url": presigned_url}
    
    # Fallback for local files
    return {"url": f"http://localhost:8000/{doc.file_url}"}

from fastapi.responses import StreamingResponse
import io

@router.get("/{id}/view")
def view_document_pdf(id: str, db: Session = Depends(get_db)):
    """
    Proxy-serve the PDF with proper inline headers so the browser's 
    built-in PDF viewer can render it and support #page=X navigation.
    """
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(404, "Not found")
    
    if doc.file_url.startswith("s3://"):
        parts = doc.file_url.replace("s3://", "").split("/")
        bucket = parts[0]
        key = "/".join(parts[1:])
        s3_client = get_s3_client()
        response = s3_client.get_object(Bucket=bucket, Key=key)
        pdf_bytes = response['Body'].read()
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline",
                "Cache-Control": "public, max-age=3600"
            }
        )
    
    # Fallback for local files
    if os.path.exists(doc.file_url):
        with open(doc.file_url, "rb") as f:
            pdf_bytes = f.read()
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": "inline"}
        )

@router.get("/", response_model=List[DocumentResponse])
def list_documents(db: Session = Depends(get_db), skip: int = 0, limit: int = 100) -> Any:
    """
    List documents with filters.
    """
    return db.query(Document).offset(skip).limit(limit).all()

from pydantic import BaseModel

class StatusUpdate(BaseModel):
    status: DocumentStatus

@router.patch("/{id}/status", response_model=DocumentResponse)
def update_document_status(id: str, payload: StatusUpdate, db: Session = Depends(get_db)) -> Any:
    """
    Update document lifecycle status.
    """
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.status = payload.status
    db.commit()
    db.refresh(doc)
    return doc

def cleanup_remote_data(doc_id: str, file_url: str):
    from pinecone import Pinecone
    
    # 1. Delete vectors from Pinecone via metadata filter
    if settings.PINECONE_API_KEY:
        try:
            pc = Pinecone(api_key=settings.PINECONE_API_KEY)
            index = pc.Index(settings.PINECONE_INDEX_NAME)
            index.delete(delete_all=False, filter={"document_id": {"$eq": doc_id}})
        except Exception as e:
            print(f"Error deleting from Pinecone: {e}")

    # 2. (Optional) Delete from S3
    if file_url and file_url.startswith("s3://"):
        parts = file_url.replace("s3://", "").split("/")
        bucket = parts[0]
        key = "/".join(parts[1:])
        s3_client = get_s3_client()
        if s3_client:
            try:
                s3_client.delete_object(Bucket=bucket, Key=key)
            except Exception as e:
                print(f"Error deleting from S3: {e}")

@router.delete("/{id}")
def delete_document(id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Delete a document and its chunks from Postgres synchronously,
    then clean up vectors from Pinecone and object from S3 in the background.
    """
    from app.models.document_chunk import DocumentChunk
    
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(404, "Not found")
        
    file_url = doc.file_url

    # 1. Delete chunks from Postgres
    db.query(DocumentChunk).filter(DocumentChunk.document_id == id).delete(synchronize_session=False)

    # 2. Delete the Document from Postgres
    db.delete(doc)
    db.commit()

    # 3. Dispatch slow network calls to background task
    background_tasks.add_task(cleanup_remote_data, doc_id=id, file_url=file_url)

    return {"message": "Document deleted successfully."}
