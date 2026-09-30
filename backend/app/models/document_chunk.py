import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Enum, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.session import Base
import enum

class ChunkType(str, enum.Enum):
    HEADER = "HEADER"
    SECTION = "SECTION"
    LEAF_PARAGRAPH = "LEAF_PARAGRAPH"
    TABLE_SUMMARY = "TABLE_SUMMARY"
    RAW_TABLE = "RAW_TABLE"
    MARKDOWN_SECTION = "MARKDOWN_SECTION"

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    parent_chunk_id = Column(UUID(as_uuid=True), ForeignKey("document_chunks.id"), nullable=True)
    chunk_type = Column(Enum(ChunkType), nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer)
    bounding_box_json = Column(JSONB, nullable=True) # {x1, y1, x2, y2}
    tree_path = Column(String(500), nullable=True)
    embedding_id = Column(String(255), nullable=True)
