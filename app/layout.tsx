import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "ONES API Proxy",
  description: "Token refresh and GraphQL proxy for ONES",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
