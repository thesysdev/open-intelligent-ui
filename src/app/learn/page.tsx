import { Learn } from "./learn";

// A public, interactive tutorial for developers. Light/dark follows the
// ?theme= query like /gallery, defaulting to light.
export default async function LearnPage({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const { theme } = await searchParams;
  return <Learn theme={theme === "dark" ? "dark" : "light"} />;
}
