from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import os
from dotenv import load_dotenv

from .models import CausalQueryResponse, ChatRequest, APIAnalysisResponse, AnalyzeTextRequest
from .services import analyze_paper, extract_text_from_pdf, chat_with_paper

load_dotenv()

app = FastAPI(title="Causal Tutor API", description="AI-powered causal inference tutor")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity in dev, restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Causal Tutor API is running"}

@app.post("/analyze", response_model=APIAnalysisResponse)
async def analyze_endpoint(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # Extract text
        text = await extract_text_from_pdf(file)
        
        # Analyze with LLM
        # We pass the text to the analysis service
        analysis = await analyze_paper(text, file.filename)
        
        # Return both analysis and full text for frontend context
        return APIAnalysisResponse(analysis=analysis, full_text=text)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-scenario", response_model=APIAnalysisResponse)
async def analyze_scenario_endpoint(request: AnalyzeTextRequest):
    try:
        # Analyze text directly
        analysis = await analyze_paper(request.text, request.scenario_name)
        return APIAnalysisResponse(analysis=analysis, full_text=request.text)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class ChatInput(BaseModel):
    message: str
    history: List[dict]
    paper_text: str
    analysis_context: Optional[str] = None # Added for context

@app.post("/chat")
async def chat_endpoint(request: ChatInput):
    # This endpoint streams the response
    try:
        # Format history for OpenAI
        # We assume history is a list of {"role": "user"/"assistant", "content": "..."}
        messages = request.history + [{"role": "user", "content": request.message}]
        
        async def generate():
            stream = await chat_with_paper(request.paper_text, request.analysis_context, messages)
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content

        return StreamingResponse(generate(), media_type="text/event-stream")

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
