import ProgressBar from "../components/ProgressBar.js";

export default function ProcessingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Running the simulation</h2>
        <p className="mt-1 text-sm text-slate-400">
          Chunking the lesson and running it through 16 simulated student archetypes...
        </p>
      </div>
      <ProgressBar />
    </div>
  );
}
