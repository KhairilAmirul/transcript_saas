// "use client";

// import { useRef, useState } from "react";

// export default function UploadBox() {
//   const inputRef = useRef<HTMLInputElement>(null);

//   const [file, setFile] = useState<File | null>(null);
//   const [status, setStatus] = useState<
//     "idle" | "uploading" | "processing" | "streaming" | "done"
//   >("idle");

//   const [text, setText] = useState("");
//   const [jobId, setJobId] = useState("");

//   const uploadFile = async (f: File) => {
//     setStatus("uploading");

//     const formData = new FormData();
//     formData.append("file", f);

//     const res = await fetch("http://127.0.0.1:8000/api/upload", {
//       method: "POST",
//       body: formData,
//     });

//     const data = await res.json();
//     setJobId(data.job_id);

//     setStatus("processing");
//     startStream(data.job_id);
//   };

//   const startStream = (id: string) => {
//     setStatus("streaming");

//     const es = new EventSource(
//       `http://127.0.0.1:8000/api/stream/${id}`
//     );

//     es.onmessage = (event) => {
//       setText((prev) => prev + event.data + " ");
//     };

//     es.addEventListener("done", () => {
//       setStatus("done");
//       es.close();
//     });

//     es.onerror = () => {
//       es.close();
//       setStatus("idle");
//     };
//   };

//   const statusUI = {
//     idle: "Ready",
//     uploading: "Uploading file...",
//     processing: "AI processing audio...",
//     streaming: "Generating transcript...",
//     done: "Completed"
//   };

//   return (
//     <div className="w-full flex justify-center py-10">
//       <div className="w-full max-w-3xl p-10 rounded-2xl bg-gradient-to-b from-white/5 to-white/0 border border-white/10 backdrop-blur-xl shadow-xl">

//         {/* HEADER */}
//         <div className="mb-8">
//           <h1 className="text-2xl font-semibold tracking-tight">
//             Whisper AI Transcription
//           </h1>
//           <p className="text-white/50 text-sm mt-1">
//             Upload audio/video → real-time AI transcription
//           </p>
//         </div>

//         {/* STATUS BAR */}
//         <div className="mb-6 flex items-center justify-between">
//           <div className="text-sm text-white/70">
//             Status:{" "}
//             <span className="text-blue-400">
//               {statusUI[status]}
//             </span>
//           </div>

//           {jobId && (
//             <div className="text-xs text-white/40">
//               Job: {jobId.slice(0, 8)}...
//             </div>
//           )}
//         </div>

//         {/* DROPZONE */}
//         <div
//           onClick={() => inputRef.current?.click()}
//           className="border border-dashed border-white/20 hover:border-blue-500 transition rounded-xl p-10 text-center cursor-pointer bg-white/5"
//         >
//           <p className="text-white/70">
//             Drag & drop file or click to upload
//           </p>

//           {file && (
//             <p className="mt-3 text-green-400 text-sm">
//               {file.name}
//             </p>
//           )}
//         </div>

//         {/* ACTION */}
//         <button
//           onClick={() => file && uploadFile(file)}
//           disabled={!file || status !== "idle"}
//           className="mt-5 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition font-medium"
//         >
//           {status === "idle" ? "Start Transcription" : "Processing..."}
//         </button>

//         {/* OUTPUT */}
//         <div className="mt-8 p-5 rounded-xl bg-black/40 border border-white/10 min-h-[200px] text-sm leading-relaxed whitespace-pre-wrap">
//           {text || (
//             <span className="text-white/40">
//               Transcript will appear here in real-time...
//             </span>
//           )}
//         </div>

//         {/* INPUT */}
//         <input
//           ref={inputRef}
//           type="file"
//           className="hidden"
//           onChange={(e) => {
//             const f = e.target.files?.[0];
//             if (f) setFile(f);
//           }}
//         />
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Mic,
  FileAudio,
  Sparkles,
  Clock,
  Layers,
  CheckCircle2,
  Loader2,
  Radio,
} from "lucide-react";

export default function UploadBox() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "streaming" | "done"
  >("idle");

  const [text, setText] = useState("");
  const [jobId, setJobId] = useState("");

  const [progress, setProgress] = useState(0);
  const [doneChunks, setDoneChunks] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const API = process.env.NEXT_PUBLIC_API_URL;
  
  useEffect(() => {
    if (progress > 0 && startTime) {
      const elapsed = (Date.now() - startTime) / 1000;
      const estimatedTotal = elapsed / (progress / 100);
      const remaining = estimatedTotal - elapsed;

      if (remaining > 0) {
        setEta(Math.round(remaining));
      }
    }
  }, [progress, startTime]);

  const uploadFile = async (f: File) => {
    setStatus("uploading");
    setStartTime(Date.now());

    const formData = new FormData();
    formData.append("file", f);

    // const res = await fetch("http://127.0.0.1:8000/api/upload", {
    const res = await fetch(`${API}/api/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    setJobId(data.job_id);
    setStatus("processing");

    startStream(data.job_id);
  };

  const startStream = (id: string) => {
    setStatus("streaming");

    // const es = new EventSource(`http://127.0.0.1:8000/api/stream/${id}`);
    const es = new EventSource(`${API}/api/stream/${id}`);
    
    es.onmessage = (event) => {
      setText((prev) => prev + event.data + " ");
    };

    es.addEventListener("progress", (event: MessageEvent) => {
      const data = JSON.parse(event.data);

      setProgress(data.percent);
      setDoneChunks(data.done_chunks);
      setTotalChunks(data.total_chunks);
    });

    es.addEventListener("done", () => {
      setStatus("done");
      setProgress(100);
      es.close();
    });

    es.onerror = () => {
      es.close();
      setStatus("idle");
    };
  };

  const statusConfig = {
    idle: { text: "Ready to transcribe", icon: Radio, color: "text-muted-foreground" },
    uploading: { text: "Uploading media", icon: Loader2, color: "text-accent" },
    processing: { text: "AI is processing", icon: Loader2, color: "text-accent" },
    streaming: { text: "Transcribing live", icon: Radio, color: "text-green-400" },
    done: { text: "Complete", icon: CheckCircle2, color: "text-green-400" },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Real-time AI Transcription</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-4">
          <span className="text-balance">Turn audio into</span>
          <br />
          <span className="text-balance bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
            live transcripts.
          </span>
        </h1>

        <p className="max-w-xl mx-auto text-muted-foreground text-lg leading-relaxed">
          Upload audio or video and watch AI generate transcripts in real-time
          with streaming output.
        </p>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        className="rounded-2xl border border-border bg-card/50 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/20"
      >
        <div className="grid lg:grid-cols-[400px_1fr]">
          {/* Left Panel - Controls */}
          <div className="border-b lg:border-b-0 lg:border-r border-border p-6 lg:p-8 space-y-6">
            {/* Status Indicator */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </span>
              <div className={`flex items-center gap-2 ${currentStatus.color}`}>
                <StatusIcon
                  className={`h-4 w-4 ${
                    status === "uploading" || status === "processing"
                      ? "animate-spin"
                      : ""
                  }`}
                />
                <span className="text-sm font-medium">{currentStatus.text}</span>
              </div>
            </div>

            {/* Upload Zone */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => inputRef.current?.click()}
              className="group relative rounded-xl border-2 border-dashed border-border hover:border-accent/50 bg-secondary/30 hover:bg-secondary/50 p-8 cursor-pointer transition-all duration-200"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary border border-border group-hover:border-accent/30 transition-colors">
                  {file ? (
                    <FileAudio className="h-6 w-6 text-accent" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {file ? "File selected" : "Upload media file"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {file ? file.name : "Drag & drop or click to browse"}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Start Button */}
            <button
              onClick={() => file && uploadFile(file)}
              disabled={!file || status !== "idle"}
              className="w-full rounded-xl bg-foreground text-background py-3.5 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === "idle" ? "Start Transcription" : "Processing..."}
            </button>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Layers className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Progress
                  </span>
                </div>
                <p className="text-xl font-semibold text-foreground">{progress}%</p>
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Mic className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Chunks
                  </span>
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {doneChunks}/{totalChunks || 0}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">ETA</span>
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {eta ? `${eta}s` : "--"}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Processing progress</span>
                <span className="text-foreground font-medium">{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut", duration: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70"
                />
              </div>
            </div>

            {/* Audio Visualizer */}
            {(status === "processing" || status === "streaming") && (
              <div className="rounded-xl border border-border bg-secondary/30 p-5">
                <div className="flex items-center justify-center gap-[3px] h-12">
                  {[...Array(24)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: [8, 24, 12, 32, 16],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.04,
                        ease: "easeInOut",
                      }}
                      className="w-[3px] rounded-full bg-accent/60"
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  AI is analyzing your audio...
                </p>
              </div>
            )}
          </div>

          {/* Right Panel - Transcript */}
          <div className="p-6 lg:p-8 flex flex-col min-h-[500px] lg:min-h-[600px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Live Output
                </p>
                <h2 className="text-xl font-semibold text-foreground">
                  Transcript
                </h2>
              </div>
              <div className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
                {text.split(" ").filter(Boolean).length} words
              </div>
            </div>

            <div className="relative flex-1 rounded-xl border border-border bg-background/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-accent/3 to-transparent pointer-events-none" />

              <div className="relative z-10 h-full overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                  {text ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-base leading-7 text-foreground/90 whitespace-pre-wrap"
                    >
                      {text}
                      {(status === "streaming" || status === "processing") && (
                        <motion.span
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          className="inline-block w-2 h-5 bg-accent ml-1 rounded-sm align-middle"
                        />
                      )}
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border mb-5">
                        <Sparkles className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Waiting for input
                      </h3>
                      <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
                        Your transcript will appear here in real-time as the AI
                        processes your audio file.
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
        }}
      />
    </div>
  );
}
