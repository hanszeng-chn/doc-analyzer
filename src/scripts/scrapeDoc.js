/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { Document } = require("@langchain/core/documents");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { configDotenv } = require("dotenv");
configDotenv();

const scrapeConfig = {
  url: "https://js.langchain.com/docs/introduction/",
  // paths to include
  includeRegex: ["/docs"],
  // paths to exclude
  excludeRegex: [],
};

async function scrapeSubpages() {
  try {
    const host = new URL(scrapeConfig.url).host;
    const baseDir = path.join(__dirname, `../../scraped/${host}`);
    fs.mkdirSync(baseDir, { recursive: true });
    // Ensure the base directory exists
    const documents = [];

    // recursive scraping all subpages
    const unScrapLinks = [scrapeConfig.url];
    const scrapedLinksSet = new Set(new URL(scrapeConfig.url).pathname);
    while (unScrapLinks.length > 0) {
      const currentLink = unScrapLinks.shift();
      const response = await fetch(currentLink);
      const data = await response.text();
      const $ = cheerio.load(data);
      // only extract text from p tag
      const mainPageContent = $("p, code, h1, h2, h3, h4, h5, h6")
        .map((i, el) => $(el).text())
        .get()
        .join("\n");

      // split page content into chunks
      const textSpliter = new RecursiveCharacterTextSplitter({
        chunkSize: 2000,
        chunkOverlap: 200,
      });
      const chunks = await textSpliter.splitText(mainPageContent);
      const docs = chunks.map(
        (chunk) =>
          new Document({
            pageContent: chunk,
            metadata: { source: currentLink },
          })
      );
      documents.push(...docs);

      // find all subpages links
      const excludeSelector = scrapeConfig.excludeRegex
        .map((item) => `a[href^="${item}"]`)
        .join(", ");
      const includeSelector = scrapeConfig.includeRegex
        .map((item) => `a[href^="${item}"]`)
        .join(", ");
      let selector = `${includeSelector}`;
      if (excludeSelector) {
        selector = `${includeSelector}:not(${excludeSelector})`;
      }
      const oriCount = unScrapLinks.length;
      $(selector).each((i, anchorItem) => {
        const href = $(anchorItem).attr("href");
        const subpageUrl = new URL(href, scrapeConfig.url);
        const name = subpageUrl.pathname;
        // avoid duplicate subpages
        if (!scrapedLinksSet.has(name)) {
          scrapedLinksSet.add(name);
          unScrapLinks.push(subpageUrl.href);
        }
      });
      console.log(
        `find ${
          unScrapLinks.length - oriCount
        } new subpages from ${currentLink}`
      );
    }
    console.log(
      "Scraping completed successfully.",
      scrapedLinksSet.size,
      documents.length
    );
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
scrapeSubpages();
