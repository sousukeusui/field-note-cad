import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 用の最小実行成果物を生成（.next/standalone）
  output: "standalone",
};

export default nextConfig;
