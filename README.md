# ⚡ MCP Tools

A growing monorepo of high-impact [Model Context Protocol](https://modelcontextprotocol.io) tool servers for AI-assisted development. Works with **Claude Desktop**, **OpenAI**, **GitHub Copilot**, **Azure AI**, and any MCP-compatible client.

> **30 tools shipped. 50 more incoming. 1000 planned.**

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 9

### Setup

```bash
git clone https://github.com/seraphinerenard/mcp-tools.git
cd mcp-tools
pnpm install
pnpm build
```

### Using a Tool

Each tool is a standalone MCP server. Run any tool directly:

```bash
node tools/<tool-name>/dist/index.js
```

Or add it to your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`):

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

---

## 🟢 Available Tools (30)

### Analyzers
| Tool | Description |
|------|-------------|
| `analyze-bundle-size` | Estimate JS bundle size impact of a dependency |
| `analyze-code-complexity` | Cyclomatic complexity analysis |
| `analyze-git-diff` | Git diff statistics and analysis |
| `analyze-npm-vulnerabilities` | Deep vulnerability scan of package-lock.json |

### Converters
| Tool | Description |
|------|-------------|
| `convert-csv-to-json` | CSV to structured JSON with type inference |
| `convert-curl-to-fetch` | curl commands to JavaScript fetch |
| `convert-json-to-typescript` | JSON to TypeScript interfaces |
| `convert-markdown-to-html` | Markdown to HTML with GFM support |
| `convert-units` | Unit conversion (length, weight, volume, data, temp) |
| `convert-yaml-to-json` | YAML to JSON with anchor resolution |

### Formatters
| Tool | Description |
|------|-------------|
| `format-json` | Pretty-print, minify, sort keys, validate JSON |
| `format-sql` | Format SQL queries with keyword casing |
| `minify-css` | CSS minification |
| `minify-js` | Basic JS minification |
| `prettify-html` | HTML formatting with indentation |

### Generators
| Tool | Description |
|------|-------------|
| `generate-dockerfile` | Dockerfile generation from project context |
| `generate-lorem-ipsum` | Placeholder text generation |
| `generate-password` | Cryptographically secure passwords with entropy |
| `generate-regex` | Test and get common regex patterns |
| `generate-uuid` | Generate random UUIDs (v4) |

### Validators
| Tool | Description |
|------|-------------|
| `validate-email` | Email validation with disposable detection |
| `validate-json-schema` | Validate JSON against JSON Schema |
| `validate-openapi` | OpenAPI spec validation |
| `validate-url` | URL validation and parsing |

### Utilities
| Tool | Description |
|------|-------------|
| `calculate-date` | Date arithmetic, diff, and info |
| `diff-text` | Line-by-line text comparison with LCS |
| `encode-decode-base64` | Encode/decode base64, URL-safe variant |
| `hash-text` | Hash text (MD5, SHA1, SHA256, SHA512) |
| `lint-markdown` | Markdown linting for common issues |
| `security-scan-headers` | HTTP security header analysis |

---

## 🟡 Coming Soon (50)

### Data Transformation
| Tool | Description |
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
| `convert-cron-to-human` | Cron expression to human-readable text |
| `convert-human-to-cron` | Natural language to cron expression |
| `convert-timestamp-formats` | Between Unix/ISO/RFC2822/relative timestamps |
| `convert-color-formats` | Between hex/rgb/hsl/cmyk/oklch |
| `convert-har-to-curl` | HAR network logs to curl commands |
| `convert-regex-to-explanation` | Regex pattern to human-readable explanation |

### Code Quality & Analysis
| Tool | Description |
|------|-------------|
| `analyze-code-duplication` | Detect copy-paste code across files |
| `analyze-dead-code` | Find unused exports, functions, variables |
| `analyze-import-graph` | Dependency graph and circular import detection |
| `analyze-license-compliance` | Check dependency licenses against policy |
| `analyze-api-breaking-changes` | Compare two API specs for breaking changes |
| `analyze-hardcoded-secrets` | Scan for hardcoded secrets, keys, tokens |
| `analyze-todo-tracker` | Extract and categorise all TODO/FIXME/HACK comments |
| `analyze-dependency-freshness` | How outdated are your dependencies |
| `analyze-typescript-strict` | Find TS strictness issues (any, implicit, etc) |
| `analyze-react-performance` | Detect unnecessary re-renders, missing keys |
| `analyze-css-unused` | Find unused CSS selectors against HTML/JSX |
| `analyze-sql-injection-risk` | Static analysis for SQL injection patterns |
| `analyze-docker-image-size` | Dockerfile size optimization suggestions |
| `analyze-docker-security` | Dockerfile security best practices |
| `analyze-github-actions-security` | Workflow security issues (injection, permissions) |
| `analyze-package-json-health` | package.json best practices audit |

### Generation & Scaffolding
| Tool | Description |
|------|-------------|
| `generate-gitignore` | .gitignore from project type and language |
| `generate-license` | License file from SPDX identifier |
| `generate-editorconfig` | .editorconfig from language/framework |
| `generate-tsconfig` | tsconfig.json from project requirements |
| `generate-eslint-config` | ESLint config from preferences |
| `generate-prettier-config` | Prettier config from style guide |
| `generate-github-actions` | CI/CD workflow from project type |
| `generate-docker-compose` | docker-compose.yml from service requirements |

### Validation & Security
| Tool | Description |
|------|-------------|
| `validate-cron` | Cron expression syntax validation |
| `validate-semver` | Semantic versioning validation |
| `validate-jwt` | JWT token decode and validate |
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
│   ├── format-json/       # Each tool is a standalone MCP server
│   ├── validate-email/
│   └── ...
├── scripts/
│   └── create-tool.ts     # Tool scaffolding generator
├── pnpm-workspace.yaml
└── tsconfig.json
```

- **Monorepo** managed with pnpm workspaces
- **Shared core** (`@mcp-tools/core`) for MCP server bootstrap, input validation, and error handling
- **Each tool** is independently publishable to npm as `@mcp-tools/<name>`
- **TypeScript** throughout for type safety and broad ecosystem compatibility
- **Zero external runtime dependencies** where possible — most tools use only Node.js built-ins

---

## Contributing

```bash
# Create a new tool from template
pnpm create-tool <tool-name>

# Build everything
pnpm build

# Build a single tool
pnpm --filter @mcp-tools/<tool-name> build

# Type check
pnpm typecheck
```

---

## License

MIT
