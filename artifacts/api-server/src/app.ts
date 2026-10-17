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
  console.log(`Files in dist:`, fs.readdirSync(clientDist).slice(0,20));
  const assetsPath = path.join(clientDist, "assets");
  if (fs.existsSync(assetsPath)) {
    console.log(`Files in assets:`, fs.readdirSync(assetsPath).slice(0,10));
  }
  app.use(express.static(clientDist, { maxAge: "1y", immutable: true, index: false }));
  // SPA fallback - only for non-file routes
  app.get(/^(?!\/api).*/, (req, res) => {
    // If request looks like a file with extension, don't send index.html (let 404 happen)
    if (req.path.includes(".") && !req.path.endsWith(".html")) {
      return res.status(404).end();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  console.log("Frontend dist not found, checked:", possibleDistPaths);
}

export default app;
