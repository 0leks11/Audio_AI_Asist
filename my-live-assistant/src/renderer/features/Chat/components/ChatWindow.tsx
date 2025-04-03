import React, { useRef, useEffect } from "react";
import { Message } from "../../../../types";
import { MessageItem } from "./MessageItem";
import { LoadingIndicator } from "../../../components/LoadingIndicator"; // Shared component
import "./ChatWindow.css"; // Add basic styling

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = React.memo(
  ({ messages, isLoading }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages]); // Scroll when new messages arrive

    return (
      <div className="chat-window">
        <div className="message-list">
          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="loading-container">
              <LoadingIndicator size="small" />
            </div>
          )}
          {/* Anchor for scrolling */}
          <div ref={messagesEndRef} />
        </div>
      </div>
    );
  }
);
