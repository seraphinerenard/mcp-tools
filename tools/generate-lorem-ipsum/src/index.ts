#!/usr/bin/env node
import { createToolServer, startServer } from "@mcp-tools/core";
import { z } from "zod";

const server = createToolServer({ name: "@mcp-tools/generate-lorem-ipsum", version: "0.1.0" });

const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum", "at", "vero", "eos",
  "accusamus", "iusto", "odio", "dignissimos", "ducimus", "blanditiis",
  "praesentium", "voluptatum", "deleniti", "atque", "corrupti", "quos", "dolores",
  "quas", "molestias", "recusandae", "itaque", "earum", "rerum", "hic", "tenetur",
  "sapiente", "delectus", "aut", "reiciendis", "voluptatibus", "maiores", "alias",
  "consequatur", "perferendis", "doloribus", "asperiores", "repellat",
];

function randomWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function generateSentence(minWords: number, maxWords: number): string {
  const count = minWords + Math.floor(Math.random() * (maxWords - minWords + 1));
  const words: string[] = [];
  for (let i = 0; i < count; i++) words.push(randomWord());
  words[0] = words[0][0].toUpperCase() + words[0].slice(1);
  return words.join(" ") + ".";
}

function generateParagraph(sentenceCount: number): string {
  const sentences: string[] = [];
  for (let i = 0; i < sentenceCount; i++) {
    sentences.push(generateSentence(5, 15));
  }
  return sentences.join(" ");
}

server.tool(
  "generate-lorem-ipsum",
  "Generate lorem ipsum placeholder text by paragraphs, sentences, or words.",
  {
    type: z.enum(["paragraphs", "sentences", "words"]).default("paragraphs").describe("Type of output"),
    count: z.number().min(1).max(100).default(3).describe("Number of paragraphs/sentences/words"),
    startWithLorem: z.boolean().default(true).describe("Start with 'Lorem ipsum dolor sit amet...'"),
  },
  async ({ type, count, startWithLorem }) => {
    let text: string;

    if (type === "words") {
      const words: string[] = [];
      for (let i = 0; i < count; i++) words.push(randomWord());
      if (startWithLorem && count >= 2) { words[0] = "lorem"; words[1] = "ipsum"; }
      text = words.join(" ");
    } else if (type === "sentences") {
      const sentences: string[] = [];
      for (let i = 0; i < count; i++) sentences.push(generateSentence(5, 15));
      if (startWithLorem) sentences[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
      text = sentences.join(" ");
    } else {
      const paragraphs: string[] = [];
      for (let i = 0; i < count; i++) paragraphs.push(generateParagraph(4 + Math.floor(Math.random() * 4)));
      if (startWithLorem) {
        paragraphs[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " + paragraphs[0];
      }
      text = paragraphs.join("\n\n");
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        type, count,
        wordCount: text.split(/\s+/).length,
        characterCount: text.length,
        text,
      }, null, 2) }],
    };
  }
);

startServer(server);
