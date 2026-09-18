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
    # Use the Gemini/Pinecone service to get real response
    result = copilot_service.generate_response(request.query_text)
    
    # Log the query for compliance audit
    log = QueryLog(
        user_id=current_user.id,
        query_text=request.query_text,
        retrieved_context_ids=[str(uuid.uuid4()) for _ in result["sources"]], # mock ids for sources
        generated_answer=result["answer"],
        groundedness_score=result["groundedness_score"],
        is_flagged=False
    )
    db.add(log)
    db.commit()
    
    sources = []
    for src in result["sources"]:
        sources.append(RetrievedSource(
            chunk_id=str(uuid.uuid4()),
            document_title="Extracted Chunk",
            page_number=1,
            snippet=src
        ))

    return QueryResponse(
        response_text=result["answer"],
        groundedness_score=result["groundedness_score"],
        retrieved_sources=sources,
        applied_disclosures=["The information provided is derived from the most recent fund prospectus..."]
    )

@router.websocket("/ws/query")
async def websocket_query(websocket: WebSocket):
    """
    WebSocket endpoint for streaming AI responses.
    """
    await websocket.accept()
    try:
        while True:
            # Wait for user query
            data = await websocket.receive_text()
            
            # Send initial context metadata
            await websocket.send_json({
                "type": "metadata",
                "sources": [
                    {"title": "Factsheet", "page_number": 4, "snippet": "The Horizon Balanced Growth Fund has an annual expense ratio of 1.25%."},
                ],
                "groundedness_score": 0.96
            })

            # Stream chunks from Gemini
            async for chunk in copilot_service.generate_response_stream(data):
                await websocket.send_json({
                    "type": "chunk",
                    "text": chunk
                })
            
            # Signal end of message
            await websocket.send_json({"type": "end"})
            
    except WebSocketDisconnect:
        print("Client disconnected")
