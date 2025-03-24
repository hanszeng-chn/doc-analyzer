import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { tool } from "@langchain/core/tools";
import { OpenAIEmbeddings } from "@langchain/openai";
import path from "path";
import { z } from "zod";
const retrieveSchema = z.object({ query: z.string() });
const lcRetriever = tool(
  async ({ query }) => {
    const vectorStore = await FaissStore.load(
      path.join(process.cwd(), "/crawled/js.langchain.com"),
      new OpenAIEmbeddings({
        model: "text-embedding-3-large",
      })
    );
    console.log("query", query);
    const retrievedDocs = await vectorStore.similaritySearch(query, 3);
    console.log("retrievedDocs", retrievedDocs);
    const serialized = retrievedDocs
      .map(
        (doc) => `source: ${doc.metadata.source}, content: ${doc.pageContent};`
      )
      .join("\n");
    return serialized;
  },
  {
    name: "retrieve_from_langchain_docs",
    description: `Searches and retrieves relevant documents from the embedded LangChain.js documentation based on the provided query. Returns both the content and source of matching documents.`,
    schema: retrieveSchema,
    responseFormat: "content",
  }
);

export { lcRetriever };
