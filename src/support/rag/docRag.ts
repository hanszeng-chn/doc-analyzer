import { ChatOpenAI } from "@langchain/openai";

import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createRetrievalChain } from "langchain/chains/retrieval";

export async function retrieveDocs(query: string) {
  const embeddings = new OpenAIEmbeddings();
  const loader = new CheerioWebBaseLoader(
    "https://js.langchain.com/docs/tutorials/rag",
    {
      selector: "p",
    }
  );
  const docs = await loader.load();
  // console.log("docs", docs[0].pageContent);
  // since a large document is harder to search and not fit for the context window of the model, we need to split the document into smaller chunks
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const texts = await textSplitter.splitDocuments(docs);
  console.log(`created ${JSON.stringify(texts)} chunks`);
  // Store the vector embeddings in memory
  const vectorStore = await MemoryVectorStore.fromDocuments(texts, embeddings);
  console.log("vector store created");
  // Retrieve and generate using the relevant snippets of the blog.
  const retriever = vectorStore.asRetriever();
  const systemPrompt =
    "You are an assistant for question-answering tasks. " +
    "Use the following pieces of retrieved context to answer " +
    "the question. If you don't know the answer, say that you " +
    "don't know. Use three sentences maximum and keep the " +
    "answer concise." +
    "\n\n" +
    "{context}";

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", "{input}"],
  ]);

  // const prompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");
  const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

  const qaChain = await createStuffDocumentsChain({
    llm,
    prompt,
    outputParser: new StringOutputParser(),
  });
  console.log("ragChain created");

  const ragChain = await createRetrievalChain({
    retriever,
    combineDocsChain: qaChain,
  });
  const result = await ragChain.invoke({
    input: query,
  });
  return result;
}
