"""
Convenience launcher to run the FastAPI backend server on http://localhost:8000.
"""

import uvicorn

if __name__ == "__main__":
    print("==================================================================")
    print("  ANTARCTIC AI NAVIGATION DECISION SUPPORT SYSTEM - BACKEND API")
    print("  Server running at: http://localhost:8000")
    print("  Interactive API Docs: http://localhost:8000/docs")
    print("==================================================================")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
