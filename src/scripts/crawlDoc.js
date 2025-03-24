/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { Document } = require("@langchain/core/documents");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { Readability } = require("@mozilla/readability");
const TurndownService = require("turndown");
const { JSDOM } = require("jsdom");
const { configDotenv } = require("dotenv");
configDotenv();

const crawlConfig = {
  url: "https://js.langchain.com/docs/tutorials/llm_chain",
  // paths to include
  includeRegex: ["/docs"],
  // paths to exclude
  excludeRegex: [],
};

async function fetchDocument({
  // first page of the document
  url,
  // callback function to process the document
  callback,
  // paths to exclude
  excludeRegex,
  // paths to include
  includeRegex,
}) {
  const unScrapLinks = [url];
  // avoid duplicate subpages
  const crawledLinksSet = new Set(new URL(url).pathname);
  while (unScrapLinks.length > 0) {
    const currentLink = unScrapLinks.shift();
    const response = await fetch(currentLink);
    const html = await response.text();
    const doc = new JSDOM(html, {
      url: currentLink,
    });
    const readability = new Readability(doc.window.document, {
      url: currentLink,
    });
    const article = readability.parse();
    await callback(article, currentLink);

    const excludeSelector = excludeRegex
      .map((item) => `a[href^="${item}"]`)
      .join(", ");
    const includeSelector = includeRegex
      .map((item) => `a[href^="${item}"]`)
      .join(", ");
    let selector = `${includeSelector}`;
    if (excludeSelector) {
      selector = `${includeSelector}:not(${excludeSelector})`;
    }
    const oriCount = unScrapLinks.length;
    const $ = cheerio.load(html);
    $(selector).each((i, anchorItem) => {
      const href = $(anchorItem).attr("href");
      const subpageUrl = new URL(href, url);
      const name = subpageUrl.pathname;
      // avoid duplicate subpages
      if (!crawledLinksSet.has(name)) {
        crawledLinksSet.add(name);
        unScrapLinks.push(subpageUrl.href);
      }
    });
    console.log(
      `find ${unScrapLinks.length - oriCount} new subpages from ${currentLink}`
    );
  }
}

async function crawlSubpages() {
  try {
    const host = new URL(crawlConfig.url).host;
    const baseDir = path.join(__dirname, `../../crawled/${host}`);
    fs.mkdirSync(baseDir, { recursive: true });
    // Ensure the base directory exists
    const documents = [];
    var turndownService = new TurndownService();

    await fetchDocument({
      ...crawlConfig,
      callback: async (article, currentLink) => {
        var markdown = turndownService.turndown(article.content);
        // split page content into chunks
        const textSpliter = new RecursiveCharacterTextSplitter({
          chunkSize: 3000,
          chunkOverlap: 100,
        });
        const chunks = await textSpliter.splitText(
          `#${article.title}\n${markdown}`
        );
        console.log(chunks);
        const docs = chunks.map(
          (chunk) =>
            new Document({
              pageContent: chunk,
              metadata: { source: currentLink },
            })
        );
        documents.push(...docs);
      },
    });
    // console.log(documents);
    const startTime = performance.now();
    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-large",
    });
    const vectorStore = await FaissStore.fromDocuments(documents, embeddings);
    vectorStore.save(baseDir);
    console.log("Vector store saved successfully.");
    console.log(`Time taken: ${performance.now() - startTime} milliseconds`);
  } catch (error) {
    console.error("Error during scraping:", error);
  }
  return;
}
crawlSubpages();
