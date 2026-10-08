import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenUI · Intelligent UI",
  description: "Open-source interactive answers. Explore, plan, learn, and create with OpenUI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
