import { useState } from "react";
import type { AssessResponse } from "@lucida/shared";
import { postAssess } from "./api/assessmentClient.js";
import UploadPage from "./pages/UploadPage.js";
import ProcessingPage from "./pages/ProcessingPage.js";
import ResultsPage from "./pages/ResultsPage.js";

type AppState =
  | { status: "upload" }
  | { status: "processing" }
  | { status: "results"; data: AssessResponse }
  | { status: "error"; message: string };

export default function App() {
  const [state, setState] = useState<AppState>({ status: "upload" });

  async function handleSubmit(rawText: string) {
    setState({ status: "processing" });
    try {
      const data = await postAssess(rawText);
      setState({ status: "results", data });
    } catch (err) {
      setState({ status: "error", message: (err as Error).message });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {state.status === "upload" && <UploadPage onSubmit={handleSubmit} />}
      {state.status === "processing" && <ProcessingPage />}
      {state.status === "results" && (
        <ResultsPage data={state.data} onReset={() => setState({ status: "upload" })} />
      )}
      {state.status === "error" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold text-red-400">Assessment failed</p>
          <p className="max-w-md text-sm text-slate-400">{state.message}</p>
          <button
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
            onClick={() => setState({ status: "upload" })}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
