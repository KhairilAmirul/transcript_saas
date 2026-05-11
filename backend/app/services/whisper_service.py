from faster_whisper import WhisperModel

# FORCE CPU (IMPORTANT FIX)
model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)

def transcribe_file(file_path: str):
    segments, info = model.transcribe(file_path)

    text_output = []

    for segment in segments:
        text_output.append(segment.text)

    return " ".join(text_output)