import dotenv from "dotenv";
dotenv.config({ quiet: true });

const { default: app } = await import("./app");
const { registerExecutionWorker } = await import("./lib/queue.js");
const { registerDraftRenderWorker } = await import("./lib/draftRenderQueue.js");
const { runExecutionFromJob } = await import("./services/execution.js");

registerExecutionWorker((data) => runExecutionFromJob(data));
registerDraftRenderWorker();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
