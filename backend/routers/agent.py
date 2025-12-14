from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agent.core import get_agent_executor
import os

router = APIRouter()

from typing import Optional
import uuid

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

@router.post("/chat", response_model=ChatResponse)
def chat_with_agent(request: ChatRequest):
    if not os.getenv("GOOGLE_API_KEY"):
         raise HTTPException(status_code=503, detail="Google API Key not configured")
         
    agent_runnable = get_agent_executor()
    if not agent_runnable:
        raise HTTPException(status_code=503, detail="Agent initialization failed")
    
    # Generate session ID if not provided
    session_id = request.session_id or str(uuid.uuid4())
        
    try:
        # invoke with config for session_id (Sync execution in threadpool)
        result = agent_runnable.invoke(
            {"input": request.query},
            config={"configurable": {"session_id": session_id}}
        )
        return {"response": result['output'], "session_id": session_id}
    except Exception as e:
        # In production, log the full error
        print(f"Agent Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
