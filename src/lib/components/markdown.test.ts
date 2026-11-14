import { isValidElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { inline } from "./markdown";

type Link = ReactElement<{ href?: string }>;
const parts = (text: string) => [inline(text)].flat() as unknown[];
const links = (text: string) => parts(text).filter((p): p is Link => isValidElement(p) && p.type === "a").map((a) => a.props.href);

describe("inline links", () => {
  it("keeps parentheses inside a link URL", () => {
    const text = "See [Mercury](https://en.wikipedia.org/wiki/Mercury_(planet)) for more.";
    expect(links(text)).toEqual(["https://en.wikipedia.org/wiki/Mercury_(planet)"]);
    expect(parts(text).filter((p) => typeof p === "string")).toEqual(["See ", " for more."]);
  });

  it("still ends a plain link at its closing parenthesis", () => {
    expect(links("[Docs](https://example.com/docs) (free)")).toEqual(["https://example.com/docs"]);
    expect(links("([Docs](https://example.com/docs))")).toEqual(["https://example.com/docs"]);
  });
});
