import React, { useState, useEffect } from "react";

interface UserInputFieldProps {
  currentPrompt: string;
  onPromptChange: (prompt: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  presetPrompt?: string;
}

export const UserInputField: React.FC<UserInputFieldProps> = ({
  currentPrompt,
  onPromptChange,
  onSubmit,
  disabled,
  presetPrompt = "",
}) => {
  const [inputValue, setInputValue] = useState(currentPrompt || presetPrompt);
  const [isCustomPrompt, setIsCustomPrompt] = useState(false);

  useEffect(() => {
    if (!isCustomPrompt) {
      setInputValue(presetPrompt);
    }
  }, [presetPrompt, isCustomPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onPromptChange(inputValue);
      onSubmit();
    }
  };

  const handleTogglePrompt = () => {
    setIsCustomPrompt(!isCustomPrompt);
    if (!isCustomPrompt) {
      setInputValue("");
    } else {
      setInputValue(presetPrompt);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePrompt}
            className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            {isCustomPrompt
              ? "Использовать предустановленный промпт"
              : "Использовать свой промпт"}
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={disabled}
            placeholder={
              isCustomPrompt
                ? "Введите свой промпт..."
                : "Используется предустановленный промпт"
            }
            className="flex-1 p-2 border rounded"
          />
          <button
            type="submit"
            disabled={disabled || !inputValue.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Отправить
          </button>
        </div>
      </div>
    </form>
  );
};
