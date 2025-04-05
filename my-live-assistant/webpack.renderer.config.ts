import type { Configuration } from "webpack";
import path from "path";

import { rules } from "./webpack.rules";
import { plugins } from "./webpack.plugins";

// Обновленное правило для CSS с поддержкой PostCSS/Tailwind
rules.push({
  test: /\.css$/,
  use: [
    { loader: "style-loader" },
    { loader: "css-loader" },
    { loader: "postcss-loader" },
  ],
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css"],
    alias: {
      "@components": path.resolve(__dirname, "src/renderer/components"),
      "@features": path.resolve(__dirname, "src/renderer/features"),
      "@hooks": path.resolve(__dirname, "src/renderer/hooks"),
      "@context": path.resolve(__dirname, "src/renderer/context"),
    },
  },
  optimization: {
    minimize: false,
  },
  mode: "development",
  devtool: "inline-source-map",
};
