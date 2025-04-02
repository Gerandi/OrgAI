import uvicorn
import os # Import os module
from app.api.api import app

if __name__ == "__main__":
    print("Starting OrgAI backend server...")
    print(f"Current directory: {os.getcwd()}")
    print("Backend will be available at: http://localhost:8000")
    print("API docs will be available at: http://localhost:8000/docs")

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)