import { notFound } from "next/navigation";
import { Preview } from "./preview";

// A development page that renders one OpenUI Lang program handed in by a test
// script (window.__OPENUI_PROGRAM__), for the benchmark's screenshots.
// ?library=coach renders with the Clash Royale coach library.
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ theme?: string; library?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { theme, library } = await searchParams;
  return <Preview theme={theme === "dark" ? "dark" : "light"} kind={library === "coach" ? "coach" : "chat"} />;
}
