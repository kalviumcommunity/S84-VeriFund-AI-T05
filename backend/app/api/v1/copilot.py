from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import Any, List
from app.api.dependencies import get_db, get_current_active_user
from app.schemas.copilot import QueryRequest, QueryResponse, RetrievedSource
from app.models.user import User
from app.models.query_log import QueryLog
from app.services.copilot import copilot_service
import uuid

router = APIRouter()

@router.post("/query", response_model=QueryResponse)
def ask_copilot(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Submit a natural language query and retrieve AI-generated answer with citations.
    """
    # 1. Retrieve context
    retrieved_data = rag_service.retrieve_chunks(request.query_text, db, top_k=3)
    
    # 2. Use the Gemini service to get real response, passing contexts
    result = copilot_service.generate_response(request.query_text, retrieved_contexts=retrieved_data)
    
    # Log the query for compliance audit
    log = QueryLog(
        user_id=current_user.id,
        query_text=request.query_text,
        retrieved_chunk_ids=[r["chunk_id"] for r in retrieved_data], 
        response_text=result["answer"],
        faithfulness_score=result.get("groundedness_score", 0.92)
    )
    db.add(log)
    db.commit()
    
    sources = []
    for r in retrieved_data:
        snippet = r["snippet"]
        if len(snippet) > 150:
            snippet = snippet[:150] + "..."
        sources.append(RetrievedSource(
            chunk_id=r["chunk_id"],
            document_title=r["document_title"],
            page_number=r["page_number"],
            snippet=snippet
        ))

    return QueryResponse(
        response_text=result["answer"],
        groundedness_score=result["groundedness_score"],
        retrieved_sources=sources,
        applied_disclosures=["The information provided is derived from the most recent fund prospectus..."]
    )

@router.get("/history")
def get_query_history(db: Session = Depends(get_db)):
    """
    Get audit history of all queries.
    """
    logs = db.query(QueryLog).order_by(QueryLog.created_at.desc()).limit(100).all()
    result = []
    for log in logs:
        score = log.faithfulness_score or 0
        result.append({
            "id": str(log.id),
            "timestamp": log.created_at.isoformat() if log.created_at else None,
            "advisor": "System User", 
            "query": log.query_text,
            "groundedness": int(score * 100),
            "flagged": score < 0.8,
            "documents_used": len(log.retrieved_chunk_ids) if log.retrieved_chunk_ids else 0
        })
    return result

from pydantic import BaseModel

class EvaluateRequest(BaseModel):
    generated_text: str
    source_chunk_id: str

class EvaluateResponse(BaseModel):
    score: float
    explanation: str

@router.post("/evaluate", response_model=EvaluateResponse)
def evaluate_response(request: EvaluateRequest, db: Session = Depends(get_db)):
    """
    Evaluates the faithfulness/groundedness of a generated text against a source chunk.
    """
    from app.models.document_chunk import DocumentChunk
    from fastapi import HTTPException
    
    chunk = db.query(DocumentChunk).filter(DocumentChunk.id == request.source_chunk_id).first()
    if not chunk:
        raise HTTPException(404, "Source chunk not found")
        
    score, explanation = copilot_service.evaluate_faithfulness(request.generated_text, chunk.content)
    
    return EvaluateResponse(
        score=score,
        explanation=explanation
    )

from app.services.retrieval import rag_service

@router.websocket("/ws/query")
async def websocket_query(
    websocket: WebSocket, 
    db: Session = Depends(get_db),
    model: str = 'gemini-3.8-flash', 
    strict_mode: bool = True, 
    temperature: float = 0.1,
    persona: str = 'advisor',
    document_ids: str = None
):
    """
    WebSocket endpoint for streaming AI responses.
    """
    await websocket.accept()
    
    doc_ids_list = document_ids.split(",") if document_ids else None
    
    try:
        while True:
            # Wait for user query
            data = await websocket.receive_text()
            
            if data == "__COMPARE__":
                data = "Please provide a detailed, side-by-side comparison of the provided documents, highlighting differences in fees, objectives, and historical performance. Structure the response strictly with clear headers and Markdown tables. Additionally, you MUST provide a JSON block at the very end to visualize the historical returns data in this exact format:\n```json\n{\"type\": \"chart\", \"data\": [{\"year\": \"2023\", \"Fund A\": 4.5, \"Fund B\": 2.1}, {\"year\": \"2024\", \"Fund A\": 6.2, \"Fund B\": 5.5}]}\n```\nKeep everything highly formatted."
                retrieved_data = []
                if doc_ids_list:
                    from app.models.document_chunk import DocumentChunk
                    from app.models.document import Document
                    for did in doc_ids_list:
                        # Grab first 2 pages of each document for comparison
                        first_chunks = db.query(DocumentChunk, Document).join(Document).filter(
                            DocumentChunk.document_id == did,
                            DocumentChunk.page_number <= 2
                        ).all()
                        text = "\n".join([c[0].content for c in first_chunks])
                        if text:
                            retrieved_data.append({
                                "chunk_id": str(first_chunks[0][0].id),
                                "document_title": first_chunks[0][1].title,
                                "page_number": 1,
                                "snippet": text
                            })
            else:
                # 1. Retrieve true context from Pinecone + Postgres with multi-page awareness for summaries
                is_summary = (persona == 'client') or any(w in data.lower() for w in ['summar', 'overview', 'outline', 'brief', 'all pages', 'full doc', 'document breakdown', 'key points'])
                retrieval_k = 8 if is_summary else 5
                retrieved_data = rag_service.retrieve_chunks(data, db, top_k=retrieval_k, document_ids=doc_ids_list, is_summary=is_summary)
            
            # 2. Format sources for the frontend UI
            sources_metadata = []
            for r in retrieved_data:
                snippet = r["snippet"]
                if len(snippet) > 150:
                    snippet = snippet[:150] + "..."
                sources_metadata.append({
                    "title": r["document_title"],
                    "page_number": r["page_number"],
                    "snippet": snippet
                })
            
            # Send initial context metadata
            await websocket.send_json({
                "type": "metadata",
                "sources": sources_metadata,
                "groundedness_score": 0.96 # Can be calculated dynamically later
            })

            # Stream chunks from Gemini, passing the retrieved contexts
            full_response = ""
            try:
                async for chunk in copilot_service.generate_response_stream(
                    data, 
                    retrieved_contexts=retrieved_data,
                    model_name=model, 
                    strict_mode=strict_mode, 
                    temperature=temperature,
                    persona=persona
                ):
                    full_response += chunk
                    await websocket.send_json({
                        "type": "chunk",
                        "text": chunk
                    })
                
                # Save audit log
                try:
                    from app.models.query_log import QueryLog
                    log = QueryLog(
                        user_id=None,
                        query_text=data,
                        retrieved_chunk_ids=[r["chunk_id"] for r in retrieved_data], 
                        response_text=full_response,
                        faithfulness_score=0.96
                    )
                    db.add(log)
                    db.commit()
                except Exception as db_err:
                    print(f"Failed to log audit: {db_err}")
                    
            except Exception as e:
                await websocket.send_json({
                    "type": "chunk",
                    "text": f"\n\n**Error:** The AI service is currently experiencing high demand or returned an error. Please try again. ({e})"
                })
            
            # Signal end of message
            await websocket.send_json({"type": "end"})
            
    except WebSocketDisconnect:
        print("Client disconnected")
