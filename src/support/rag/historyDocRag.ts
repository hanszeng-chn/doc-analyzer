import { retrieveDocs } from "./docRag";

export async function retrieveHistoryDocs(query: string) {
  const result = await retrieveDocs(query);
  return result;
}
