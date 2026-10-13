import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve frontend in production (Render) - try multiple possible paths
const possibleDistPaths = [
  path.resolve(process.cwd(), "dist"),
  path.resolve(__dirname, "../../../dist"),
  path.resolve(__dirname, "../../dist"),
  path.resolve(process.cwd(), "../../dist"),
];

let clientDist = "";
for (const p of possibleDistPaths) {
  if (fs.existsSync(p)) {
    clientDist = p;
    break;
  }
}

if (clientDist) {
  console.log(`Serving frontend from: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  console.log("Frontend dist not found, checked:", possibleDistPaths);
}

export default app;
