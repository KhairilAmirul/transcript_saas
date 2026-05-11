import shutil
import subprocess
from pathlib import Path

def split_audio(file_path: str, output_dir: str, segment_time: int = 10):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    output_pattern = str(output_dir / "chunk_%03d.wav")

    command = [
        "ffmpeg",
        "-y",
        "-i", file_path,
        "-ar", "16000",
        "-ac", "1",
        "-f", "segment",
        "-segment_time", str(segment_time),
        "-reset_timestamps", "1",
        output_pattern
    ]

    subprocess.run(command, check=True)

    chunk_paths = sorted(output_dir.glob("chunk_*.wav"))
    return [str(path) for path in chunk_paths]

def cleanup_chunk_dir(output_dir: str):
    shutil.rmtree(output_dir, ignore_errors=True)
