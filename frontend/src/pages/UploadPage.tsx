import { useState } from "react";

const MAX_LENGTH = 20000;

export default function UploadPage({ onSubmit }: { onSubmit: (rawText: string) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      setError("Paste a lesson plan before running the simulation.");
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(`Lesson plan is too long (max ${MAX_LENGTH} characters).`);
      return;
    }
    setError(null);
    onSubmit(trimmed);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold text-slate-100">Lucida</h1>
        <p className="mt-2 text-slate-400">
          Paste a lesson plan and test it against a simulated classroom of 500 students before you teach it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          className="h-80 w-full resize-none rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-100 placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
          placeholder="Paste your lesson plan here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          className="self-start rounded-md bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-950 hover:bg-white"
        >
          Run simulation
        </button>
      </form>

      <aside className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
        <p className="mb-2 font-medium text-slate-300">What gets simulated</p>
        <p className="mb-1">4 academic tiers: on-grade, struggling, advanced, low-income/high-needs</p>
        <p>4 learning styles: visual, auditory, read/write, kinesthetic</p>
      </aside>
    </div>
  );
}
