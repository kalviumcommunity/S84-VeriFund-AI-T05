import uuid
from sqlalchemy import Column, String, DateTime, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timezone
from app.db.session import Base

class QueryLog(Base):
    __tablename__ = "query_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    query_text = Column(String, nullable=False)
    response_text = Column(String, nullable=False)
    retrieved_chunk_ids = Column(JSONB, default=[])
    faithfulness_score = Column(Float, nullable=True)
    as_of_date = Column(DateTime(timezone=True), nullable=True)
    disclosures_applied = Column(JSONB, default=[])
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
