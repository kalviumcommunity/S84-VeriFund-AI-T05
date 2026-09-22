import uuid
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from app.db.session import Base
import enum

class DocumentStatus(str, enum.Enum):
    APPROVED = "APPROVED"
    DRAFT = "DRAFT"
    SUPERSEDED = "SUPERSEDED"
    EXPIRED = "EXPIRED"

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), nullable=True) # For multi-tenant if needed later
    title = Column(String(255), nullable=False)
    file_url = Column(String, nullable=False)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.DRAFT)
    effective_date = Column(DateTime(timezone=True))
    expiration_date = Column(DateTime(timezone=True), nullable=True)
    version = Column(String(50))
    asset_class = Column(String(100))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
