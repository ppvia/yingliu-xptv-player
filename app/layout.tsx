import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "映流 · 在线播放器",
  description: "加载 XPTV 视频源，浏览、搜索与在线播放。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
