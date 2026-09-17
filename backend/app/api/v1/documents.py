from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Any
import shutil
import os
import uuid
from datetime import datetime

from app.api.dependencies import get_db
from app.schemas.document import DocumentResponse, DocumentCreate
from app.models.document import Document, DocumentStatus
from app.services.ingestion import ingestion_service

router = APIRouter()

@router.post("/upload", response_model=DocumentResponse)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
) -> Any:
    """
    Upload PDF and trigger ingestion in the background.
    """
    # 1. Save file locally (mock S3)
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 2. Create DB Record
    new_doc = Document(
        title=file.filename.replace(".pdf", ""),
        file_url=file_path,
        status=DocumentStatus.DRAFT,
        version="1.0",
        asset_class="Unknown",
        effective_date=datetime.now()
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    # 3. Trigger Ingestion Background Task
    background_tasks.add_task(
        ingestion_service.process_pdf, 
        file_path=file_path, 
        document_id=str(new_doc.id), 
        db=db
    )
    
    return new_doc

@router.get("/", response_model=List[DocumentResponse])
def list_documents(db: Session = Depends(get_db), skip: int = 0, limit: int = 100) -> Any:
    """
    List documents with filters.
    (Mock implementation)
    """
    import uuid
    from datetime import datetime
    from app.models.document import DocumentStatus
    
    return [
        {
            "id": uuid.uuid4(),
            "title": "Horizon Balanced Growth Fund Factsheet",
            "file_url": "s3://mock/path.pdf",
            "status": DocumentStatus.APPROVED,
            "effective_date": datetime.now(),
            "version": "3.2",
            "asset_class": "Balanced",
            "created_at": datetime.now()
        },
        {
            "id": uuid.uuid4(),
            "title": "Atlas Equity Fund Prospectus",
            "file_url": "s3://mock/path2.pdf",
            "status": DocumentStatus.APPROVED,
            "effective_date": datetime.now(),
            "version": "5.0",
            "asset_class": "Equity",
            "created_at": datetime.now()
        }
    ]

@router.patch("/{id}/status", response_model=DocumentResponse)
def update_document_status(*, db: Session = Depends(get_db), id: str, status: str) -> Any:
    """
    Update document lifecycle status.
    """
    pass
