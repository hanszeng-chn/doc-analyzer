import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { solarizedlight } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CustomResponseRendererProps {
  uid: string;
  dataTransferMode: string;
  status: string;
  content: any[];
}

const CustomResponseRenderer = ({
  uid,
  dataTransferMode,
  status,
  content,
}: CustomResponseRendererProps) => {
  return (
    <div className="message-container" key={uid}>
      {content.map((msg, index) => (
        <div key={index}>
          {msg.type === "code" ? (
            <SyntaxHighlighter language={msg.language} style={solarizedlight}>
              {msg.code}
            </SyntaxHighlighter>
          ) : (
            <p>{msg.text}</p>
          )}
        </div>
      ))}
    </div>
  );
};
