import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "./analytics";
import { SiteChrome } from "./site-chrome";

// Variable Inter (no fixed weights), so the theme's in-between weights
// (440, 560, 640) render as set.
const inter = Inter({
  subsets: ["latin"],
});

const description =
  "Ask anything and get an interactive answer instead of text: maps, photos, charts, drawings and working tools, built with OpenUI.";

export const metadata: Metadata = {
  // Link previews need absolute URLs. The public page is openui.com/demo/intelligent-ui, which
  // the docs app proxies to this deployment, so opengraph-image.png resolves there too.
  metadataBase: new URL("https://www.openui.com"),
  title: "Open Intelligent UI",
  description,
  openGraph: { title: "Open Intelligent UI", description, siteName: "OpenUI", type: "website" },
  twitter: { card: "summary_large_image", title: "Open Intelligent UI", description },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SiteChrome>{children}</SiteChrome>
        <Analytics />
      </body>
    </html>
  );
}
