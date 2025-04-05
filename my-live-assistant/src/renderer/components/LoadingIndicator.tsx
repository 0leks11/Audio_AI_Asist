import React from "react";


interface LoadingIndicatorProps {
  size?: "small" | "medium" | "large";
  text?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = "medium",
  text = "Загрузка...",
}) => {
  return (
    <div className={`loading-indicator loading-${size}`}>
      <div className="loading-spinner"></div>
      <p className="loading-text">{text}</p>
    </div>
  );
};
