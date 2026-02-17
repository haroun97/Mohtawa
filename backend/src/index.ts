import dotenv from "dotenv";
dotenv.config({ quiet: true });

const { default: app } = await import("./app");

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
