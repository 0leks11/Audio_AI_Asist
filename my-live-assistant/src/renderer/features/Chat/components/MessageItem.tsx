import React from "react";
import { Message } from "../../../../types";

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const messageClass =
    message.sender === "user" ? "message-user" : "message-gemini";
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`message-item ${messageClass}`}>
      <p className="message-text">{message.text}</p>
      <span className="message-time">{formattedTime}</span>
    </div>
  );
};

MessageItem.displayName = "MessageItem";
