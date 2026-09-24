from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class QueryRequest(BaseModel):
    query: str
    as_of_date: Optional[datetime] = None
    document_filters: Optional[List[str]] = None

class RetrievedSource(BaseModel):
    chunk_id: str
    document_title: str
    page_number: int
    snippet: str

class QueryResponse(BaseModel):
    response_text: str
    groundedness_score: float
    retrieved_sources: List[RetrievedSource]
    applied_disclosures: List[str]
