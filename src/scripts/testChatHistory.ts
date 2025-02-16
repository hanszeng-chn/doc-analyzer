import {
  START,
  END,
  MessagesAnnotation,
  StateGraph,
  MemorySaver,
  Annotation,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { v4 as uuidv4 } from "uuid";
import { configDotenv } from "dotenv";
configDotenv();

async function main() {
  const config = { configurable: { thread_id: uuidv4() } };

  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
  });

  const promptTemplate = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are a helpful assistant. Answer all questions to the best of your ability in {language}.",
    ],
    ["placeholder", "{messages}"],
  ]);

  const GraphAnnotation = Annotation.Root({
    ...MessagesAnnotation.spec,
    language: Annotation<string>(),
  });

  // Define the function that calls the model
  const callModel = async (state: typeof GraphAnnotation.State) => {
    const prompt = await promptTemplate.invoke(state);
    // console.log(state, prompt, "bbb");
    const response = await llm.invoke(prompt);

    return { messages: response };
  };

  // Define a new graph
  const workflow = new StateGraph(GraphAnnotation)
    // Define the node and edge
    .addNode("model", callModel)
    .addEdge(START, "model")
    .addEdge("model", END);

  // Add memory
  const memory = new MemorySaver();
  const app = workflow.compile({ checkpointer: memory });

  const output = await app.invoke(
    { messages: ["Hi, I'm Bob, how are you?"], language: "Chinese" },
    config
  );
  console.log(output.messages[output.messages.length - 1]);
  const input2 = [
    {
      role: "user",
      content: "What's my name?",
    },
  ];
  const output2 = await app.invoke({ messages: input2 }, config);
  console.log(output2.messages[output2.messages.length - 1]);
}

main();
