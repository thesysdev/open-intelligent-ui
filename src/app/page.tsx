import { AgentShell } from "@/components/agent-shell";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return <AgentShell capture={query.capture === "sf"} />;
}
