"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { OpenUISiteChrome } from "@/components/openui-site-header";

// /preview renders bare programs for the benchmark's screenshots, so it stays without the header.
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/preview")) return children;
  return <OpenUISiteChrome title="Open Intelligent UI">{children}</OpenUISiteChrome>;
}
