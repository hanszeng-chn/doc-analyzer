# doc-analyzer

Scrape and index documents using a embedding model and save it as local vector store.
Chatbot using langchain and langgraph. Retrieve documents from the vector store if needed (judging by agent). And answer the question using the retrieved documents.

## Scrape and index documents

Modify the config in `src/scripts/scrapeDoc.js` to scrape and index the documents you want. Then run the script.

```bash
pnpm run scrape
```

## Run the app

```bash
pnpm run dev
```
