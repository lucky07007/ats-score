# api/index.py

from fastapi import FastAPI, Request, HTTPException # Import 'Request'
from fastapi.responses import JSONResponse
import io
import re
import traceback
from pdfminer.high_level import extract_text_to_fp
import docx

# Initialize FastAPI application
app = FastAPI()

# --- Utility Functions for Text Extraction ---

def extract_text(file_content: bytes, filename: str) -> str:
    """Extracts text from PDF or DOCX file content."""
    
    filename = filename.lower()
    
    if filename.endswith('.pdf'):
        try:
            # Use pdfminer.six for PDF text extraction
            output_string = io.StringIO()
            extract_text_to_fp(io.BytesIO(file_content), output_string)
            print("Successfully extracted text from PDF.")
            return output_string.getvalue()
        except Exception as e:
            print(f"ERROR: PDF extraction failed for {filename}. {e}")
            raise ValueError("Failed to read PDF file. It might be scanned or corrupted.")
            
    elif filename.endswith('.docx'):
        try:
            # Use python-docx for DOCX text extraction
            document = docx.Document(io.BytesIO(file_content))
            text = '\n'.join([p.text for p in document.paragraphs])
            print("Successfully extracted text from DOCX.")
            return text
        except Exception as e:
            print(f"ERROR: DOCX extraction failed for {filename}. {e}")
            raise ValueError("Failed to read DOCX file. It might be corrupted or in an old DOC format.")
        
    raise ValueError("Unsupported file type. Please use PDF or DOCX.")


# --- Core ATS Analysis Logic ---

def analyze_resume_text(text: str):
    """Performs a basic, rule-based ATS analysis on the extracted text."""
    
    text = text.lower()
    score = 0
    recommendations = []
    
    # 1. Formatting & Headers Check (Max 30 points)
    if re.search(r'(experience|work history)', text) and \
       re.search(r'(education|academic)', text) and \
       re.search(r'(skills|core competencies)', text):
        score += 30
    else:
        score += 10
        recommendations.append("🚨 Critical: Ensure all major sections (Experience, Education, Skills) are clearly titled.")

    # 2. Length Check (Max 20 points)
    word_count = len(text.split())
    if 300 <= word_count <= 800:
        score += 20
    elif word_count < 300:
        recommendations.append(f"🔴 Too Short: Word count is low ({word_count}). Elaborate on your experience.")
        score += 5
    elif word_count > 800:
        recommendations.append(f"🟡 Too Long: Word count is high ({word_count}). Keep professional resumes concise (max 2 pages).")
        score += 10

    # 3. Action Verb Check (Max 20 points)
    action_verbs = ['achieved', 'led', 'managed', 'developed', 'implemented', 'improved', 'reduced', 'created', 'quantified']
    verb_count = sum(text.count(verb) for verb in action_verbs)
    if verb_count >= 10:
        score += 20
        recommendations.append("🟢 Strong: Good use of action verbs. Quantify your impact whenever possible!")
    elif verb_count < 5:
        recommendations.append(f"🟠 Weak: Use more strong action verbs at the start of your bullet points. Found only {verb_count}.")
        score += 5
        
    # 4. ATS Keywords (Max 30 points)
    sample_keywords = ['javascript', 'python', 'sql', 'agile', 'data analysis', 'internship', 'leadership']
    found_keywords = [kw for kw in sample_keywords if kw in text]
    
    keyword_score = len(found_keywords) * (30 / len(sample_keywords)) if sample_keywords else 0
    score += keyword_score
    recommendations.append(f"🔑 Keywords: Found {len(found_keywords)} out of {len(sample_keywords)} sample critical skills.")

    # Final Score Normalization
    final_score = min(100, max(0, int(score)))
    
    # Generate final message
    if final_score >= 80:
        status_message = "Excellent! Highly optimized and likely to pass modern ATS with ease."
    elif final_score >= 60:
        status_message = "Good. Will pass, but address recommendations for maximum visibility."
    else:
        status_message = "High Risk. Your resume may be filtered by ATS. Address the critical red flags immediately."

    return {
        "score": final_score,
        "status": status_message,
        "recommendations": recommendations,
        "word_count": word_count
    }


# --- API Endpoint ---

@app.post("/api/analyze")
async def analyze(request: Request): # Receives raw 'Request' object
    """Main API endpoint to receive file and return ATS score."""
    
    try:
        # 1. Read the custom header for the filename sent from the frontend
        filename = request.headers.get('X-File-Name', 'uploaded_file').lower()
        if not filename:
            raise HTTPException(status_code=400, detail="Filename header missing from request.")

        print(f"Processing file: {filename}")

        if not (filename.endswith('.pdf') or filename.endswith('.docx')):
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

        # 2. Read the raw request body directly (CRITICAL FIX)
        file_content = await request.body()
        
        if not file_content:
             raise HTTPException(status_code=400, detail="File content is empty.")

        print(f"File content read, size: {len(file_content) / (1024*1024):.2f} MB")

        # Extract Text
        text = extract_text(file_content, filename)
        
        # Run Analysis
        result = analyze_resume_text(text)
        
        print(f"Analysis complete. Score: {result['score']}")
        return JSONResponse(content=result)
        
    except ValueError as e:
        # Handles errors raised from the extract_text function (e.g., corrupt file)
        print(f"Client-side error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        # Catches all unexpected internal errors
        error_trace = traceback.format_exc()
        print(f"FATAL SERVER ERROR:\n{error_trace}")
        
        # Return a generic 500 error to the client
        raise HTTPException(status_code=500, detail="An internal server error occurred during analysis. Check server logs.")

handler = app
