import { notFound } from "next/navigation";
import { Preview } from "./preview";

// A development page that renders one OpenUI Lang program handed in by a test
// script (window.__OPENUI_PROGRAM__), for the benchmark's screenshots.
// ?library=clash renders with the Clash Royale coach library, ?library=chess with the chess coach.
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ theme?: string; library?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { theme, library } = await searchParams;
  return <Preview theme={theme === "dark" ? "dark" : "light"} kind={library === "clash" ? "coach" : library === "chess" ? "chess" : "chat"} />;
}
