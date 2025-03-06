import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";

import "./cron.js";

const app = express();

dotenv.config();

app.use(express.json({ limit: "1mb" }));
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

import medicineRoutes from "./routes/medicine.js";

// Routes
app.use("/medicines", medicineRoutes);

export default app;
