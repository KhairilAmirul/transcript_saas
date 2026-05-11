# import json
# from fastapi import APIRouter, UploadFile, File, Request
# from sse_starlette.sse import EventSourceResponse
# from pathlib import Path
# from sqlalchemy import text as sql_text
# import uuid
# import shutil
# import threading
# import time

# from app.db import engine
# from app.services.audio_service import split_audio, cleanup_chunk_dir
# from app.services.whisper_service import model

# router = APIRouter()

# progress_lock = threading.Lock()
# job_progress = {}

# UPLOAD_DIR = Path("uploads")
# UPLOAD_DIR.mkdir(exist_ok=True)

# CHUNK_BASE_DIR = UPLOAD_DIR / "chunks"
# CHUNK_BASE_DIR.mkdir(parents=True, exist_ok=True)


# # =========================
# # WORKER
# # =========================
# def process_transcription(job_id: str, file_path: str):
#     chunk_dir = CHUNK_BASE_DIR / job_id
#     print("🔥 WORKER START:", job_id)
#     print("📂 FILE:", file_path)
#     # update status → processing
#     with engine.begin() as conn:
#         conn.execute(sql_text("""
#             UPDATE jobs
#             SET status='processing'
#             WHERE id=:id
#         """), {"id": job_id})

#     try:
#         chunk_paths = split_audio(file_path, str(chunk_dir), segment_time=10)
#         print("✂️ CHUNKS CREATED:", len(chunk_paths))
#         print(chunk_paths)
#         if not chunk_paths:
#             raise RuntimeError("No audio chunks were created")

#         with progress_lock:
#             job_progress[job_id]["total_chunks"] = len(chunk_paths)
#             job_progress[job_id]["percent"] = 0

#         for chunk_index, chunk_path in enumerate(chunk_paths, start=1):
#             print("🎧 PROCESS CHUNK:", chunk_path)
#             print("🤖 TRANSCRIBING...")
#             segments, info = model.transcribe(chunk_path)
#             print("📝 CHUNK TEXT:", chunk_text)
#             chunk_text = ""

#             for segment in segments:
#                 segment_text = segment.text.strip()
#                 if not segment_text:
#                     continue
#                 chunk_text += segment_text + " "

#             if chunk_text:
#                 with engine.begin() as conn:
#                     conn.execute(sql_text("""
#                         UPDATE jobs
#                         SET result = CONCAT(COALESCE(result, ''), :chunk)
#                         WHERE id=:id
#                     """), {
#                         "chunk": chunk_text,
#                         "id": job_id
#                     })

#             with progress_lock:
#                 total_chunks = job_progress[job_id].get("total_chunks", 0)
#                 done_chunks = chunk_index
#                 percent = int(done_chunks / total_chunks * 100) if total_chunks else 0
#                 job_progress[job_id].update({
#                     "done_chunks": done_chunks,
#                     "percent": percent
#                 })

#             with engine.begin() as conn:
#                 conn.execute(sql_text("""
#                     UPDATE jobs
#                     SET status='processing'
#                     WHERE id=:id
#                 """), {"id": job_id})

#     except Exception as e:
#         with engine.begin() as conn:
#             conn.execute(sql_text("""
#                 UPDATE jobs
#                 SET status='error', result=:err
#                 WHERE id=:id
#             """), {
#                 "err": str(e),
#                 "id": job_id
#             })
#         return

#     finally:
#         cleanup_chunk_dir(str(chunk_dir))

#     with progress_lock:
#         job_progress[job_id]["percent"] = 100
#         job_progress[job_id]["done_chunks"] = job_progress[job_id].get("total_chunks", 0)

#     # mark done
#     with engine.begin() as conn:
#         conn.execute(sql_text("""
#             UPDATE jobs
#             SET status='done'
#             WHERE id=:id
#         """), {"id": job_id})


# # =========================
# # UPLOAD ROUTE
# # =========================
# @router.post("/upload")
# # async def upload(file: UploadFile = File(...)):
# async def upload(request: Request, file: UploadFile = File(...)):

#     job_id = str(uuid.uuid4())
#     base_url = str(request.base_url).rstrip("/")
#     file_path = UPLOAD_DIR / f"{job_id}_{file.filename}"

#     # save file
#     with open(file_path, "wb") as buffer:
#         shutil.copyfileobj(file.file, buffer)

#     # insert job
#     with engine.begin() as conn:
#         conn.execute(sql_text("""
#             INSERT INTO jobs (id, filename, filepath, status)
#             VALUES (:id, :filename, :filepath, 'pending')
#         """), {
#             "id": job_id,
#             "filename": file.filename,
#             "filepath": str(file_path)
#         })

#     with progress_lock:
#         job_progress[job_id] = {
#             "done_chunks": 0,
#             "total_chunks": 0,
#             "percent": 0
#         }

#     # start worker
#     threading.Thread(
#         target=process_transcription,
#         args=(job_id, str(file_path)),
#         daemon=True
#     ).start()

#     return {
#         "job_id": job_id,
#         "stream_url": f"{base_url}/api/stream/{job_id}"
#     }


# # =========================
# # STREAM ROUTE (SSE)
# # =========================
# @router.get("/stream/{job_id}")
# async def stream(job_id: str):

#     def event_generator():

#         last_text = ""
#         last_progress = -1

#         while True:

#             with engine.begin() as conn:
#                 result = conn.execute(sql_text("""
#                     SELECT status, COALESCE(result, '')
#                     FROM jobs
#                     WHERE id=:id
#                 """), {"id": job_id}).fetchone()

#             if not result:
#                 yield {
#                     "event": "error",
#                     "data": "job not found"
#                 }
#                 return

#             status, text_result = result

#             # send incremental update
#             if text_result and text_result != last_text:
#                 new_part = text_result[len(last_text):]
#                 last_text = text_result

#                 yield {
#                     "event": "message",
#                     "data": new_part
#                 }

#             with progress_lock:
#                 progress = job_progress.get(job_id, {})
#             if progress:
#                 percent = progress.get("percent", 0)
#                 if percent != last_progress:
#                     last_progress = percent
#                     yield {
#                         "event": "progress",
#                         "data": json.dumps({
#                             "percent": percent,
#                             "done_chunks": progress.get("done_chunks", 0),
#                             "total_chunks": progress.get("total_chunks", 0)
#                         })
#                     }

#             if status == "done":
#                 if last_progress != 100:
#                     yield {
#                         "event": "progress",
#                         "data": json.dumps({
#                             "percent": 100,
#                             "done_chunks": progress.get("done_chunks", 0) if progress else 0,
#                             "total_chunks": progress.get("total_chunks", 0) if progress else 0
#                         })
#                     }
#                 yield {
#                     "event": "done",
#                     "data": "completed"
#                 }
#                 return

#             if status == "error":
#                 yield {
#                     "event": "error",
#                     "data": text_result
#                 }
#                 return

#             time.sleep(0.2)


#     return EventSourceResponse(event_generator())

import json
import uuid
import shutil
import threading
import time
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Request
from sse_starlette.sse import EventSourceResponse
from sqlalchemy import text as sql_text

from app.db import engine
from app.services.audio_service import split_audio, cleanup_chunk_dir
from app.services.whisper_service import model

router = APIRouter()

progress_lock = threading.Lock()
job_progress = {}

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

CHUNK_BASE_DIR = UPLOAD_DIR / "chunks"
CHUNK_BASE_DIR.mkdir(parents=True, exist_ok=True)


# =========================
# WORKER
# =========================
def process_transcription(job_id: str, file_path: str):
    chunk_dir = CHUNK_BASE_DIR / job_id

    print("🔥 WORKER START:", job_id)

    try:
        # update status
        with engine.begin() as conn:
            conn.execute(sql_text("""
                UPDATE jobs
                SET status='processing'
                WHERE id=:id
            """), {"id": job_id})

        chunk_paths = split_audio(file_path, str(chunk_dir), segment_time=10)
        print("✂️ chunks:", len(chunk_paths))

        if not chunk_paths:
            raise Exception("No chunks created")

        with progress_lock:
            job_progress[job_id]["total_chunks"] = len(chunk_paths)
            job_progress[job_id]["percent"] = 0

        # =========================
        # MAIN LOOP
        # =========================
        for i, chunk_path in enumerate(chunk_paths, start=1):

            print("🎧 chunk:", chunk_path)

            segments, _ = model.transcribe(chunk_path)

            chunk_text = ""   # ✅ FIX: declare BEFORE use

            for seg in segments:
                if seg.text.strip():
                    chunk_text += seg.text.strip() + " "

            print("📝 TEXT:", chunk_text)

            if chunk_text:
                with engine.begin() as conn:
                    conn.execute(sql_text("""
                        UPDATE jobs
                        SET result = CONCAT(COALESCE(result, ''), :chunk)
                        WHERE id=:id
                    """), {
                        "chunk": chunk_text,
                        "id": job_id
                    })

            with progress_lock:
                total = job_progress[job_id]["total_chunks"]
                job_progress[job_id]["done_chunks"] = i
                job_progress[job_id]["percent"] = int(i / total * 100)

        # done
        with engine.begin() as conn:
            conn.execute(sql_text("""
                UPDATE jobs
                SET status='done'
                WHERE id=:id
            """), {"id": job_id})

    except Exception as e:
        with engine.begin() as conn:
            conn.execute(sql_text("""
                UPDATE jobs
                SET status='error', result=:err
                WHERE id=:id
            """), {"err": str(e), "id": job_id})

        print("❌ ERROR:", e)

    finally:
        cleanup_chunk_dir(str(chunk_dir))


# =========================
# UPLOAD
# =========================
@router.post("/upload")
async def upload(request: Request, file: UploadFile = File(...)):

    job_id = str(uuid.uuid4())
    base_url = str(request.base_url).rstrip("/")

    file_path = UPLOAD_DIR / f"{job_id}_{file.filename}"

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    with engine.begin() as conn:
        conn.execute(sql_text("""
            INSERT INTO jobs (id, filename, filepath, status)
            VALUES (:id, :filename, :filepath, 'pending')
        """), {
            "id": job_id,
            "filename": file.filename,
            "filepath": str(file_path)
        })

    job_progress[job_id] = {
        "done_chunks": 0,
        "total_chunks": 0,
        "percent": 0
    }

    threading.Thread(
        target=process_transcription,
        args=(job_id, str(file_path)),
        daemon=True
    ).start()

    return {
        "job_id": job_id,
        "stream_url": f"{base_url}/api/stream/{job_id}"
    }


# =========================
# STREAM (SSE)
# =========================
@router.get("/stream/{job_id}")
async def stream(job_id: str):

    def event_generator():

        last_text = ""
        last_progress = -1

        while True:

            with engine.begin() as conn:
                row = conn.execute(sql_text("""
                    SELECT status, COALESCE(result, '')
                    FROM jobs WHERE id=:id
                """), {"id": job_id}).fetchone()

            if not row:
                yield {"event": "error", "data": "job not found"}
                return

            status, text = row

            if text != last_text:
                new = text[len(last_text):]
                last_text = text

                yield {
                    "event": "message",
                    "data": new
                }

            progress = job_progress.get(job_id, {})

            if progress:
                if progress["percent"] != last_progress:
                    last_progress = progress["percent"]

                    yield {
                        "event": "progress",
                        "data": json.dumps(progress)
                    }

            if status == "done":
                yield {"event": "done", "data": "completed"}
                return

            if status == "error":
                yield {"event": "error", "data": text}
                return

            time.sleep(0.3)

    return EventSourceResponse(event_generator())