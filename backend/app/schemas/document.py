from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from app.models.document import DocumentStatus

class DocumentBase(BaseModel):
    title: str
    version: str
    asset_class: str
    effective_date: datetime
    expiration_date: Optional[datetime] = None

class DocumentCreate(DocumentBase):
    file_url: str
    status: DocumentStatus = DocumentStatus.DRAFT

class DocumentResponse(DocumentBase):
    id: uuid.UUID
    file_url: str
    status: DocumentStatus
    created_at: datetime
    
    class Config:
        from_attributes = True
