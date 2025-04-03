import React from "react";

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-4">
          💖 Привет, мир!
        </h1>
        <p className="text-gray-700">
          Добро пожаловать в ваше Electron приложение с{" "}
          <span className="text-blue-500 font-semibold">Tailwind CSS</span>.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md">
            Кнопка 1
          </button>
          <button className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md">
            Кнопка 2
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
