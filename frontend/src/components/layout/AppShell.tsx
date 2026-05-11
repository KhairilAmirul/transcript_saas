// export default function AppShell({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="min-h-screen bg-[#050816] text-white">
//       <div className="max-w-5xl mx-auto px-6 py-10">
//         {children}
//       </div>
//     </div>
//   );
// }

"use client";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Subtle grid pattern */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      {/* Top glow accent */}
      <div className="pointer-events-none fixed left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-[120px]" />
      
      {/* Side accent glow */}
      <div className="pointer-events-none fixed -left-40 top-1/3 h-[500px] w-[500px] rounded-full bg-accent/3 blur-[100px]" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
