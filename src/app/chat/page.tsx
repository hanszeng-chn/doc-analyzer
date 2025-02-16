"use client";
import { useState } from "react";
import {
  AiChat,
  useAsStreamAdapter,
  StreamingAdapterObserver,
} from "@nlux/react";
import "@nlux/themes/nova.css";
import docs from "@/const/docs.json";
import "./style.scss";
import { highlighter } from "@nlux/highlighter";
import "highlight.js/styles/github.css";

const suggestions = docs.map((doc) => ({
  label: doc.name,
  value: doc.name,
}));

export default function Chat() {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<
    {
      type: string;
      content: string;
    }[]
  >([]);
  const [threadId, setThreadId] = useState<string>();

  const adapter = useAsStreamAdapter(
    async (prompt: string, observer: StreamingAdapterObserver) => {
      const body = { prompt, threadId };
      const response = await fetch("/api/doc/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.status !== 200) {
        observer.error(new Error("Failed to connect to the server"));
        return;
      }

      if (!response.body) {
        return;
      }

      // Read a stream of server-sent events
      // and feed them to the observer as they are being generated
      const headers = response.headers;
      const resThreadId = headers.get("x-thread-id");
      console.log(resThreadId);
      if (!threadId && !!resThreadId) {
        setThreadId(resThreadId);
      }
      const reader = response.body.getReader();
      const textDecoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        console.log(value);
        if (done) {
          break;
        }

        const content = textDecoder.decode(value);
        if (content) {
          observer.next(content);
        }
      }

      observer.complete();
    }
  );

  return (
    <div className="p-chat-container">
      <AiChat
        adapter={adapter}
        personaOptions={{
          assistant: {
            name: "Albert",
            avatar: "https://docs.nlkit.com/nlux/images/personas/albert.png",
            tagline: "Yer AI First Mate!",
          },
          user: {
            name: "Alex",
            avatar: "https://docs.nlkit.com/nlux/images/personas/alex.png",
          },
        }}
        messageOptions={{
          syntaxHighlighter: highlighter,
          showCodeBlockCopyButton: true,
        }}
        displayOptions={{ colorScheme: "light" }}
      />
    </div>
  );
}
