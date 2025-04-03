import React from "react";
import { Message } from "../../../../types";
import "./MessageItem.css"; // Add styling for user vs gemini messages

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = React.memo(
  ({ message }) => {
    const messageClass = `message-item message-item--${message.sender}`;
    const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className={messageClass}>
        <div className="message-content">
          <p className="message-text">{message.text}</p>
          {/* <span className="message-timestamp">{formattedTime}</span> */}
          {/* Optionally show sender */}
          {/* <span className="message-sender">{message.sender === 'gemini' ? 'Assistant' : 'User'}</span> */}
        </div>
      </div>
    );
  }
);
