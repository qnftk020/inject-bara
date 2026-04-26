import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "InjectScan — AI Prompt Injection Detector",
  description: "웹페이지에 숨겨진 AI 프롬프트 인젝션을 자동 탐지하는 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
