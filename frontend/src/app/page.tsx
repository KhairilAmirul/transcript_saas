// import AppShell from "@/components/layout/AppShell";
// import UploadBox from "@/components/transcription/UploadBox";

// export default function Home() {
//   return (
//     <AppShell>
//       <div className="flex flex-col items-center space-y-10 pt-10">
//         {/* HEADER */}
//         <div className="text-center space-y-2">
//           <h1 className="text-4xl font-semibold tracking-tight">
//             Transcript SaaS
//           </h1>
//           <p className="text-white/50">
//             Upload → AI transcription in seconds
//           </p>
//         </div>

//         {/* UPLOAD */}
//         <UploadBox />
//       </div>
//     </AppShell>
//   );
// }

import AppShell from "@/components/layout/AppShell";
import UploadBox from "@/components/transcription/UploadBox";

export default function Home() {
  return (
    <AppShell>
      <UploadBox />
    </AppShell>
  );
}
