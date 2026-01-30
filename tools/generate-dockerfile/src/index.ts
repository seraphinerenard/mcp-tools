#!/usr/bin/env node
import { createToolServer, startServer, requireOneOf, optionalString, optionalBoolean } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({
  name: "@mcp-tools/generate-dockerfile",
  version: "0.1.0",
});

const RUNTIME_CONFIGS: Record<string, {
  baseImage: string;
  buildImage?: string;
  installCmd: string;
  buildCmd: string;
  startCmd: string;
  port: number;
  copyFiles: string[];
  cacheDirs?: string[];
}> = {
  node: {
    baseImage: "node:20-slim",
    buildImage: "node:20-slim",
    installCmd: "npm ci --production",
    buildCmd: "npm run build",
    startCmd: 'node dist/index.js',
    port: 3000,
    copyFiles: ["package.json", "package-lock.json"],
    cacheDirs: ["node_modules"],
  },
  python: {
    baseImage: "python:3.12-slim",
    installCmd: "pip install --no-cache-dir -r requirements.txt",
    buildCmd: "",
    startCmd: "python app.py",
    port: 8000,
    copyFiles: ["requirements.txt"],
  },
  go: {
    baseImage: "gcr.io/distroless/static-debian12",
    buildImage: "golang:1.22-alpine",
    installCmd: "go mod download",
    buildCmd: "CGO_ENABLED=0 go build -ldflags='-s -w' -o /app .",
    startCmd: "/app",
    port: 8080,
    copyFiles: ["go.mod", "go.sum"],
  },
  rust: {
    baseImage: "debian:bookworm-slim",
    buildImage: "rust:1.77-slim",
    installCmd: "",
    buildCmd: "cargo build --release",
    startCmd: "./target/release/app",
    port: 8080,
    copyFiles: ["Cargo.toml", "Cargo.lock"],
  },
  static: {
    baseImage: "nginx:alpine",
    installCmd: "",
    buildCmd: "",
    startCmd: "",
    port: 80,
    copyFiles: [],
  },
};

const RUNTIMES = Object.keys(RUNTIME_CONFIGS) as readonly string[];

function generateDockerfile(
  runtime: string,
  multistage: boolean,
  appDir: string,
  entrypoint: string,
): string {
  const config = RUNTIME_CONFIGS[runtime];
  if (!config) return `# Unsupported runtime: ${runtime}`;

  const lines: string[] = [];

  if (runtime === "static") {
    lines.push(`FROM ${config.baseImage}`);
    lines.push(`COPY ${appDir} /usr/share/nginx/html`);
    lines.push(`EXPOSE ${config.port}`);
    lines.push('CMD ["nginx", "-g", "daemon off;"]');
    return lines.join("\n");
  }

  const useMultistage = multistage && config.buildImage;

  if (useMultistage) {
    lines.push(`# Build stage`);
    lines.push(`FROM ${config.buildImage} AS builder`);
    lines.push(`WORKDIR /build`);
    lines.push("");

    for (const file of config.copyFiles) {
      lines.push(`COPY ${file} .`);
    }
    if (config.installCmd) {
      lines.push(`RUN ${config.installCmd}`);
    }
    lines.push("");
    lines.push("COPY . .");
    if (config.buildCmd) {
      lines.push(`RUN ${config.buildCmd}`);
    }
    lines.push("");

    lines.push("# Production stage");
    if (runtime === "go") {
      lines.push(`FROM ${config.baseImage}`);
      lines.push("COPY --from=builder /app /app");
    } else if (runtime === "rust") {
      lines.push(`FROM ${config.baseImage}`);
      lines.push("COPY --from=builder /build/target/release/app /usr/local/bin/app");
    } else {
      lines.push(`FROM ${config.baseImage}`);
      lines.push(`WORKDIR /app`);
      for (const file of config.copyFiles) {
        lines.push(`COPY --from=builder /build/${file} .`);
      }
      if (runtime === "node") {
        lines.push("COPY --from=builder /build/node_modules ./node_modules");
        lines.push("COPY --from=builder /build/dist ./dist");
      }
    }
  } else {
    lines.push(`FROM ${config.buildImage || config.baseImage}`);
    lines.push(`WORKDIR /app`);
    lines.push("");

    for (const file of config.copyFiles) {
      lines.push(`COPY ${file} .`);
    }
    if (config.installCmd) {
      lines.push(`RUN ${config.installCmd}`);
    }
    lines.push("");
    lines.push("COPY . .");
    if (config.buildCmd) {
      lines.push(`RUN ${config.buildCmd}`);
    }
  }

  lines.push("");

  // Non-root user
  if (runtime !== "go") {
    lines.push("RUN addgroup --system app && adduser --system --ingroup app app");
    lines.push("USER app");
    lines.push("");
  }

  lines.push(`EXPOSE ${config.port}`);

  const cmd = entrypoint || config.startCmd;
  const cmdParts = cmd.split(" ");
  lines.push(`CMD [${cmdParts.map((p) => `"${p}"`).join(", ")}]`);

  return lines.join("\n");
}

server.tool(
  "generate-dockerfile",
  "Generate a production-ready Dockerfile for common runtimes (node, python, go, rust, static). Supports multi-stage builds, non-root users, and security best practices.",
  {
    runtime: z.enum(["node", "python", "go", "rust", "static"]).describe("Application runtime"),
    multistage: z.boolean().default(true).describe("Use multi-stage build"),
    appDir: z.string().default(".").describe("Application directory"),
    entrypoint: z.string().default("").describe("Custom entrypoint command"),
  },
  async ({ runtime, multistage, appDir, entrypoint }) => {
    requireOneOf(runtime, "runtime", RUNTIMES);

    const dockerfile = generateDockerfile(runtime, multistage, appDir, entrypoint);

    const dockerignore = [
      "node_modules", ".git", ".gitignore", "*.md",
      "Dockerfile", ".dockerignore", ".env", ".env.*",
      "dist", "build", "target", "__pycache__",
      ".vscode", ".idea", "*.log",
    ].join("\n");

    const result = {
      dockerfile,
      dockerignore,
      tips: [
        "Add a .dockerignore file with the suggested content above",
        "Use docker build --no-cache for clean builds",
        `Test with: docker build -t myapp . && docker run -p ${RUNTIME_CONFIGS[runtime].port}:${RUNTIME_CONFIGS[runtime].port} myapp`,
      ],
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

startServer(server);
