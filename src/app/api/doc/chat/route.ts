import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, ToolMessage } from "@langchain/core/messages";
import { lcRetriever } from "@/support/tools/lcRetriever";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";

const toolsByName: Record<string, DynamicStructuredTool<any>> = {
  ["retrieve_from_langchain_docs"]: lcRetriever,
};
const messageHistory = new ChatMessageHistory();

export async function POST(request: Request) {
  const { prompt } = await request.json();

  const llmWithTool = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
  }).bindTools([lcRetriever]);

  const promptTemplate = ChatPromptTemplate.fromMessages([
    new SystemMessage(
      "You are an assistant for question-answering tasks. " +
        "If you don't know the answer, say that you" +
        "don't know. Keep the answer concise." +
        "\n\n"
    ),
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  const chains = promptTemplate.pipe(llmWithTool).pipe(async (aiMessage) => {
    if (aiMessage.tool_calls?.length) {
      for (const toolCall of aiMessage.tool_calls) {
        const selectedTool = toolsByName[toolCall.name];
        if (selectedTool) {
          const toolMessage = await selectedTool.invoke(toolCall);
          messageHistory.addMessage(new ToolMessage(toolMessage));
        }
      }
      const response = await llmWithTool.invoke(
        await messageHistory.getMessages()
      );
      console.log(response);
      return response;
    }
    return aiMessage;
  });

  const chainWithHistory = new RunnableWithMessageHistory({
    runnable: chains,
    getMessageHistory: () => messageHistory,
    inputMessagesKey: "input",
    historyMessagesKey: "chat_history",
  });

  const response = await chainWithHistory.invoke(
    {
      input: prompt,
    },
    {
      configurable: {
        sessionId: "unused",
      },
    }
  );
  return new Response(response.content.toString());
  // const stream = new ReadableStream({
  //   async start(controller) {
  //     try {
  //       for await (const step of await chains.stream(
  //         {
  //           messages: [
  //             {
  //               role: "user",
  //               content: prompt,
  //             },
  //           ],
  //         },
  //         {
  //           configurable: { thread_id: threadId },
  //           streamMode: "values",
  //         }
  //       )) {
  //         const lastMessage = step.messages[step.messages.length - 1];
  //         if (isAIMessage(lastMessage)) {
  //           controller.enqueue(lastMessage.content);
  //         }
  //       }

  //       controller.close();
  //     } catch (err) {
  //       controller.error(err);
  //     }
  //   },
  // });

  // return new Response(stream, {
  //   headers: {
  //     "Content-Type": "text/event-stream",
  //     "Cache-Control": "no-cache",
  //     Connection: "keep-alive",
  //     "X-Thread-ID": threadId, // Appending threadId to the response headers
  //   },
  // });
}

// const checkpointer = new MemorySaver();

// export async function POST(request: Request) {
//   const { prompt, threadId = uuidv4() } = await request.json();

//   const llm = new ChatOpenAI({
//     modelName: "gpt-4o-mini",
//     temperature: 0,
//   });
//   const retrieveSchema = z.object({ query: z.string(), indexDir: z.string() });
//   const retrieve = tool(
//     async ({ query, indexDir }) => {
//       const vectorStore = await FaissStore.load(
//         path.join(process.cwd(), indexDir),
//         new OpenAIEmbeddings({
//           model: "text-embedding-3-large",
//         })
//       );
//       console.log(query, "search query!!");
//       const retrievedDocs = await vectorStore.similaritySearch(query, 6);
//       const serialized = retrievedDocs
//         .map(
//           (doc) =>
//             `source: ${doc.metadata.source}, content: ${doc.pageContent};`
//         )
//         .join("\n");
//       return [serialized, retrievedDocs];
//     },
//     {
//       name: "retrieve",
//       description: `Selects an indexDir from ${JSON.stringify(
//         docs
//       )} based on the input message and the "name" key in the docs config and Generates a retrieve query to search for relevant information in the selected indexDir.`,
//       schema: retrieveSchema,
//       responseFormat: "content_and_artifact",
//     }
//   );

//   async function queryOrRespond(state: typeof MessagesAnnotation.State) {
//     const llmWithTools = llm.bindTools([retrieve]);
//     const response = await llmWithTools.invoke(state.messages);
//     return { messages: [response] };
//   }

//   const tools = new ToolNode([retrieve]);

//   async function generate(state: typeof MessagesAnnotation.State) {
//     // Get generated ToolMessages
//     const recentToolMessages: ToolMessage[] = [];
//     for (let i = state["messages"].length - 1; i >= 0; i--) {
//       const message = state["messages"][i];
//       if (message instanceof ToolMessage) {
//         recentToolMessages.push(message);
//       } else {
//         break;
//       }
//     }
//     const toolMessages = recentToolMessages.reverse();
//     // Format into prompt
//     const docsContent = toolMessages
//       .map((doc) => {
//         // const source = doc.metadata.source;
//         // console.log(doc.artifact);
//         return doc.content;
//       })
//       .join("\n");
//     const systemMessageContent =
//       "You are an assistant for question-answering tasks. " +
//       "Use the following pieces of retrieved context to answer " +
//       "the question. If you don't know the answer, say that you " +
//       "don't know. Keep the answer concise." +
//       "\n\n" +
//       `${docsContent}`;

//     const conversationMessages = state.messages.filter(
//       (message) =>
//         message instanceof HumanMessage ||
//         message instanceof SystemMessage ||
//         (message instanceof AIMessage && message.tool_calls?.length == 0)
//     );
//     const prompt = [
//       new SystemMessage(systemMessageContent),
//       ...conversationMessages,
//     ];

//     // Run
//     const response = await llm.invoke(prompt);

//     // Append source information to the AI message
//     // const sources = toolMessages.map((doc) => doc.metadata.source).join(", ");
//     // response.content += `\n\nSources: ${sources}`;

//     return { messages: [response] };
//   }

//   const graphBuilder = new StateGraph(MessagesAnnotation)
//     .addNode("queryOrRespond", queryOrRespond)
//     .addNode("tools", tools)
//     .addNode("generate", generate)
//     .addEdge("__start__", "queryOrRespond")
//     .addConditionalEdges("queryOrRespond", toolsCondition, {
//       __end__: "__end__",
//       tools: "tools",
//     })
//     .addEdge("tools", "generate")
//     .addEdge("generate", "__end__");

//   const graph = graphBuilder.compile({ checkpointer });

//   const stream = new ReadableStream({
//     async start(controller) {
//       try {
//         for await (const step of await graph.stream(
//           {
//             messages: [
//               {
//                 role: "user",
//                 content: prompt,
//               },
//             ],
//           },
//           {
//             configurable: { thread_id: threadId },
//             streamMode: "values",
//           }
//         )) {
//           const lastMessage = step.messages[step.messages.length - 1];
//           if (isAIMessage(lastMessage)) {
//             controller.enqueue(lastMessage.content);
//           }
//         }

//         controller.close();
//       } catch (err) {
//         controller.error(err);
//       }
//     },
//   });

//   return new Response(stream, {
//     headers: {
//       "Content-Type": "text/event-stream",
//       "Cache-Control": "no-cache",
//       Connection: "keep-alive",
//       "X-Thread-ID": threadId, // Appending threadId to the response headers
//     },
//   });
// }
