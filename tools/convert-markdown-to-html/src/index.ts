#!/usr/bin/env node
import { createToolServer, startServer, requireString } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/convert-markdown-to-html", version: "0.1.0" });

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function convertMarkdown(md: string): string {
  let html = md;

  // Code blocks (fenced)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const langAttr = lang ? ` class="language-${lang}"` : "";
    return `<pre><code${langAttr}>${escapeHtml(code.trimEnd())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, (_m, code) => `<code>${escapeHtml(code)}</code>`);

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Horizontal rules
  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, "<hr>");

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links and images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists
  html = html.replace(/^[-*+]\s+(.+)$/gm, "<li>$1</li>");

  // Paragraphs (lines that aren't already HTML)
  const lines = html.split("\n");
  const output: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      output.push("");
    } else if (trimmed.startsWith("<")) {
      output.push(trimmed);
    } else {
      output.push(`<p>${trimmed}</p>`);
    }
  }

  return output.filter((l, i, arr) => !(l === "" && (i === 0 || arr[i - 1] === ""))).join("\n");
}

server.tool(
  "convert-markdown-to-html",
  "Convert Markdown text to HTML. Supports headings, bold, italic, code blocks, links, images, lists, blockquotes, and horizontal rules.",
  {
    markdown: z.string().describe("Markdown text to convert"),
    wrapInDocument: z.boolean().default(false).describe("Wrap output in a full HTML document"),
  },
  async ({ markdown, wrapInDocument }) => {
    requireString(markdown, "markdown");
    let html = convertMarkdown(markdown);
    if (wrapInDocument) {
      html = `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><title>Document</title></head>\n<body>\n${html}\n</body>\n</html>`;
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ html, inputLength: markdown.length, outputLength: html.length }, null, 2) }],
    };
  }
);

startServer(server);
