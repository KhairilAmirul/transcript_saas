from fastapi import APIRouter, UploadFile, File
import uuid
from pathlib import Path
import shutil

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

jobs = {}

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())

    file_path = UPLOAD_DIR / f"{job_id}_{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    jobs[job_id] = {
        "status": "uploaded",
        "file_path": str(file_path),
        "text": ""
    }

    return {
        "job_id": job_id,
        "status": "uploaded"
    }