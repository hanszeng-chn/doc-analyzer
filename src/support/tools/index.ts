import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

export async function getProfileUrlTavily(name: string) {
  const tavily = new TavilySearchResults({
    apiKey: process.env.TAVILY_API_KEY,
  });
  const res = await tavily.invoke(name);
  return res;
}
