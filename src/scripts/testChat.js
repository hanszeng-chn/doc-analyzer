/* eslint-disable @typescript-eslint/no-require-imports */
const { ChatOpenAI } = require("@langchain/openai");
const { configDotenv } = require("dotenv");
configDotenv();

async function testChat() {
  const llm = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0,
  });
  const result = await llm.invoke("Hello! Tell me about yourself.");
  console.log(result);
}
testChat();
