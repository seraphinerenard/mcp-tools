# ⚡ MCP Tools — Developer Utility Servers for AI Coding Assistants

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://typescriptlang.org)
[![MCP](https://img.shields.io/badge/MCP-Compatible-brightgreen)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green?logo=node.js)](https://nodejs.org)

The **fastest-growing open-source collection** of [Model Context Protocol](https://modelcontextprotocol.io) tool servers — purpose-built for AI-assisted development.

**30 tools live · 50 shipping soon · hundreds more to come**

Works out of the box with **Claude Desktop** · **VS Code Copilot** · **Cursor** · **Windsurf** · **OpenAI** · **Azure AI** — any MCP-compatible client.

---

## Why MCP Tools?

🔌 **Plug and play** — each tool is a standalone MCP server, ready in seconds  
🧰 **Real developer utilities** — formatters, validators, converters, analyzers, generators  
🪶 **Lightweight** — zero heavy dependencies, most tools use only Node.js built-ins  
🏗️ **Monorepo architecture** — shared core library, consistent APIs, easy to extend  
📦 **Independently publishable** — every tool ships as its own npm package  
🌐 **Cross-platform** — works with any MCP client, not locked to one provider  

---

## Installation

### Option 1: Install a Single Tool (npm)

Don't need the whole repo? Install just the tool you want:

```bash
npm install @mcp-tools/format-json
```

Then add it to your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "format-json": {
      "command": "npx",
      "args": ["@mcp-tools/format-json"]
    }
  }
}
```

Every tool is published independently — install only what you need.

### Option 2: Install Everything (monorepo)

Want the full collection? Clone and build:

```bash
git clone https://github.com/seraphinerenard/mcp-tools.git
cd mcp-tools
pnpm install
pnpm build
```

**Prerequisites:** [Node.js](https://nodejs.org/) >= 18, [pnpm](https://pnpm.io/) >= 9

Then point your MCP client at any tool:

```json
{
  "mcpServers": {
    "format-json": {
      "command": "node",
      "args": ["/path/to/mcp-tools/tools/format-json/dist/index.js"]
    }
  }
}
```

Or run directly:

```bash
node tools/format-json/dist/index.js
```

---

## 🟢 Available Tools

### 🔍 Analyzers — Code Quality, Security & Performance

| Tool | What It Does |
|------|-------------|
| `analyze-bundle-size` | Estimate JavaScript bundle size impact of any dependency |
| `analyze-code-complexity` | Cyclomatic complexity analysis for any language |
| `analyze-git-diff` | Git diff statistics, file-level breakdowns, and change analysis |
| `analyze-npm-vulnerabilities` | Deep vulnerability scan of package-lock.json |

### 🔄 Converters — Data Transformation & Format Conversion

| Tool | What It Does |
|------|-------------|
| `convert-csv-to-json` | CSV to structured JSON with automatic type inference |
| `convert-curl-to-fetch` | Translate curl commands to JavaScript fetch calls |
| `convert-json-to-typescript` | Generate TypeScript interfaces from JSON data |
| `convert-markdown-to-html` | Markdown to HTML with full GitHub Flavored Markdown support |
| `convert-units` | Convert between length, weight, volume, data, and temperature units |
| `convert-yaml-to-json` | YAML to JSON with anchor and alias resolution |

### 🎨 Formatters & Minifiers — Clean Up Code in Seconds

| Tool | What It Does |
|------|-------------|
| `format-json` | Pretty-print, minify, sort keys, and validate JSON |
| `format-sql` | Format SQL queries with configurable keyword casing |
| `minify-css` | Strip whitespace and comments from CSS |
| `minify-js` | Basic JavaScript minification |
| `prettify-html` | Auto-indent and format HTML documents |

### 🏭 Generators — Scaffold Files and Data Instantly

| Tool | What It Does |
|------|-------------|
| `generate-dockerfile` | Generate Dockerfiles from project context |
| `generate-lorem-ipsum` | Placeholder text in paragraphs, sentences, or words |
| `generate-password` | Cryptographically secure passwords with entropy scoring |
| `generate-regex` | Test strings and retrieve common regex patterns |
| `generate-uuid` | Generate RFC 4122 v4 UUIDs |

### ✅ Validators — Catch Errors Before They Ship

| Tool | What It Does |
|------|-------------|
| `validate-email` | Email validation with disposable domain detection |
| `validate-json-schema` | Validate JSON documents against JSON Schema drafts |
| `validate-openapi` | Full OpenAPI 3.x specification validation |
| `validate-url` | URL parsing, validation, and component extraction |

### 🛠️ Utilities — Everyday Developer Helpers

| Tool | What It Does |
|------|-------------|
| `calculate-date` | Date arithmetic, diffs, weekday lookups, and timezone info |
| `diff-text` | Line-by-line text comparison using LCS algorithm |
| `encode-decode-base64` | Encode and decode base64 with URL-safe variant support |
| `hash-text` | Hash text with MD5, SHA-1, SHA-256, or SHA-512 |
| `lint-markdown` | Detect common Markdown issues and style violations |
| `security-scan-headers` | Analyse HTTP security headers and score your config |

---

## 🟡 Coming Soon — Next 50 Tools

### Data Transformation
| Tool | What It Does |
|------|-------------|
| `convert-json-to-yaml` | JSON to YAML with comment preservation |
| `convert-xml-to-json` | XML to JSON with attribute handling |
| `convert-json-to-xml` | JSON to XML with namespace support |
| `convert-toml-to-json` | TOML to JSON conversion |
| `convert-json-to-toml` | JSON to TOML conversion |
| `convert-html-to-markdown` | HTML to clean Markdown |
| `convert-csv-to-sql-insert` | CSV rows to SQL INSERT statements |
| `convert-dotenv-to-json` | .env files to JSON |
| `convert-json-to-dotenv` | JSON to .env format |
| `convert-json-schema-to-typescript` | JSON Schema to TypeScript interfaces |
| `convert-json-schema-to-zod` | JSON Schema to Zod validators |
| `convert-graphql-to-typescript` | GraphQL schema to TypeScript types |
| `convert-cron-to-human` | Cron expressions to human-readable text |
| `convert-human-to-cron` | Natural language to cron expressions |
| `convert-timestamp-formats` | Between Unix, ISO 8601, RFC 2822, and relative timestamps |
| `convert-color-formats` | Between hex, RGB, HSL, CMYK, and OKLCH |
| `convert-har-to-curl` | HAR network logs to curl commands |
| `convert-regex-to-explanation` | Regex patterns to plain English explanations |

### Code Quality & Analysis
| Tool | What It Does |
|------|-------------|
| `analyze-code-duplication` | Detect copy-paste code across files |
| `analyze-dead-code` | Find unused exports, functions, and variables |
| `analyze-import-graph` | Dependency graph and circular import detection |
| `analyze-license-compliance` | Check dependency licenses against your policy |
| `analyze-api-breaking-changes` | Compare two API specs for breaking changes |
| `analyze-hardcoded-secrets` | Scan for hardcoded secrets, keys, and tokens |
| `analyze-todo-tracker` | Extract and categorise TODO, FIXME, and HACK comments |
| `analyze-dependency-freshness` | How outdated are your dependencies |
| `analyze-typescript-strict` | Find TypeScript strictness issues |
| `analyze-react-performance` | Detect unnecessary re-renders and missing keys |
| `analyze-css-unused` | Find unused CSS selectors |
| `analyze-sql-injection-risk` | Static analysis for SQL injection patterns |
| `analyze-docker-image-size` | Dockerfile size optimisation suggestions |
| `analyze-docker-security` | Dockerfile security best practices |
| `analyze-github-actions-security` | Workflow security issues and permission audit |
| `analyze-package-json-health` | package.json best practices audit |

### Generation & Scaffolding
| Tool | What It Does |
|------|-------------|
| `generate-gitignore` | .gitignore from project type and language |
| `generate-license` | License file from SPDX identifier |
| `generate-editorconfig` | .editorconfig from language and framework |
| `generate-tsconfig` | tsconfig.json from project requirements |
| `generate-eslint-config` | ESLint config from your preferences |
| `generate-prettier-config` | Prettier config from your style guide |
| `generate-github-actions` | CI/CD workflows from project type |
| `generate-docker-compose` | docker-compose.yml from service requirements |

### Validation & Security
| Tool | What It Does |
|------|-------------|
| `validate-cron` | Cron expression syntax validation |
| `validate-semver` | Semantic versioning validation |
| `validate-jwt` | JWT token decode and validation |
| `validate-yaml` | YAML syntax validation with line numbers |
| `validate-toml` | TOML syntax validation |
| `validate-dockerfile` | Dockerfile best practices validation |
| `validate-regex` | Regex syntax validation with explanation |
| `validate-sql` | SQL syntax validation |

---

## Architecture

```
mcp-tools/
├── packages/
│   └── core/              # Shared MCP server bootstrap, validation, error handling
├── tools/
│   ├── format-json/       # Each tool = standalone MCP server
│   ├── validate-email/
│   └── ...
├── scripts/
│   └── create-tool.ts     # Tool scaffolding generator
├── pnpm-workspace.yaml
└── tsconfig.json
```

**Key design decisions:**

- **pnpm workspaces** for fast installs and disk-efficient dependency sharing
- **Shared `@mcp-tools/core`** handles MCP server bootstrap, input validation, and structured error handling so each tool stays focused on its logic
- **Every tool independently publishable** to npm as `@mcp-tools/<name>`
- **TypeScript throughout** for type safety and IntelliSense in every tool
- **Minimal dependencies** — most tools run on Node.js built-ins alone

---

## Contributing

We welcome contributions! Add a new tool in minutes:

```bash
# Scaffold a new tool
pnpm create-tool <tool-name>

# Build everything
pnpm build

# Build one tool
pnpm --filter @mcp-tools/<tool-name> build

# Type check all packages
pnpm typecheck
```

---

## License

MIT — use it however you like.
