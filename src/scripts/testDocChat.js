/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { configDotenv } = require("dotenv");
configDotenv();

async function testDocChat() {
  const loadedVectorStore = await FaissStore.load(
    // path.join(__dirname, "../../scraped/nextjs.org"),
    path.join(__dirname, "../../scraped/js.langchain.com"),
    new OpenAIEmbeddings({
      model: "text-embedding-3-large",
    })
  );
  const retriever = loadedVectorStore.asRetriever();
  const docs = await retriever.invoke(
    "is it possible to embedding an image to vector?"
  );
  console.log(docs);
  // //   console.log(loadedVectorStore);
  // const docs = await loadedVectorStore.similaritySearch(
  //   "how to use cssinjs",
  //   1
  // );
  // console.log(docs);
}
testDocChat();
