# api/index.py

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import io
import re
from pdfminer.high_level import extract_text_to_fp
import docx

app = FastAPI()

# --- Core ATS Analysis Logic ---
def analyze_resume_text(text: str):
    """Performs a basic, rule-based ATS analysis on the extracted text."""
    
    text = text.lower()
    score = 0
    recommendations = []

    # 1. Formatting Check (Crucial for ATS)
    # Check for simple, clear section headers
    if re.search(r'(experience|work history)', text) and \
       re.search(r'(education|academic)', text) and \
       re.search(r'(skills|core competencies)', text):
        score += 30
    else:
        score += 10
        recommendations.append("🚨 Critical: Ensure all major sections (Experience, Education, Skills) are clearly titled and present.")

    # 2. Length Check (ATS typically filters very short/long resumes)
    word_count = len(text.split())
    if 300 <= word_count <= 800:
        score += 20
    elif word_count < 300:
        recommendations.append(f"🔴 Too Short: Word count is low ({word_count}). Elaborate on your experience and achievements.")
        score += 5
    elif word_count > 800:
        recommendations.append(f"🟡 Too Long: Word count is high ({word_count}). Keep professional resumes concise (max 2 pages).")
        score += 10

    # 3. Action Verb Check (Indicates achievement, not just responsibility)
    action_verbs = ['achieved', 'led', 'managed', 'developed', 'implemented', 'improved', 'reduced', 'created']
    verb_count = sum(text.count(verb) for verb in action_verbs)
    if verb_count >= 10:
        score += 20
        recommendations.append("🟢 Strong: Good use of action verbs. Keep quantifying your impact!")
    elif verb_count < 5:
        recommendations.append(f"🟠 Weak: Use more strong action verbs at the start of your bullet points. Found only {verb_count}.")
        score += 5

    # 4. Contact Information & Dates (Crucial for parsing)
    if re.search(r'@', text) and re.search(r'\d{4}', text): # Simple check for email and years
        score += 20
    else:
        recommendations.append("🔴 Critical: Ensure Email and a date (year) are clearly parsable by the system.")
        score += 5

    # Final Score Normalization
    final_score = min(100, max(0, score))
    
    # Generate final message
    if final_score >= 80:
        message = "Excellent! Your resume is highly optimized and likely to pass modern ATS with ease."
    elif final_score >= 60:
        message = "Good. Your resume will pass, but follow the recommendations for maximum visibility."
    else:
        message = "High Risk. Your resume may be filtered by ATS. Address the critical red flags immediately."

    return {
        "score": final_score,
        "message": message,
        "recommendations": recommendations,
        "word_count": word_count
    }

def extract_text(file_content: bytes, filename: str) -> str:
    """Extracts text from PDF or DOCX file content."""
    
    if filename.endswith('.pdf'):
        # Use pdfminer.six for PDF text extraction
        output_string = io.StringIO()
        extract_text_to_fp(io.BytesIO(file_content), output_string)
        return output_string.getvalue()
        
    elif filename.endswith('.docx'):
        # Use python-docx for DOCX text extraction
        document = docx.Document(io.BytesIO(file_content))
        return '\n'.join([p.text for p in document.paragraphs])
        
    raise ValueError("Unsupported file type.")


@app.post("/api/analyze")
async def analyze(resume: UploadFile = File(...)):
    """Main API endpoint to receive file and return ATS score."""
    
    # 1. File Type Validation
    filename = resume.filename.lower()
    if not (filename.endswith('.pdf') or filename.endswith('.docx')):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    try:
        # 2. Read File Content
        file_content = await resume.read()
        
        # 3. Extract Text
        text = extract_text(file_content, filename)
        
        # 4. Run Analysis
        result = analyze_resume_text(text)
        
        return JSONResponse(content=result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Server error during analysis: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred during analysis.")

# Vercel needs this 'handler' for the Python runtime
# The default Flask/FastAPI setup often uses 'app' or 'application'
# We use 'app' here as FastAPI is an ASGI application
handler = app
