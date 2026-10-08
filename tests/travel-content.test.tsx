import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { InlineText, nodeProps, safeUrl } from "../src/lib/travel/components";

test("generated links accept web URLs while rejecting executable and protocol-relative URLs", () => {
  assert.equal(safeUrl("https://example.com/place"), "https://example.com/place");
  assert.equal(safeUrl("http://example.com/place"), "http://example.com/place");
  assert.equal(safeUrl("/recording/sf/hero-bridge.jpg", true), "/recording/sf/hero-bridge.jpg");
  assert.equal(safeUrl("/recording/sf/hero-bridge.jpg"), undefined);
  for (const value of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "//example.com/image.jpg", "", null, 12]) {
    assert.equal(safeUrl(value), undefined);
    assert.equal(safeUrl(value, true), undefined);
  }
});

test("partial streamed children can render before every stop or image has arrived", () => {
  assert.deepEqual(nodeProps(undefined), []);
  assert.deepEqual(nodeProps([null, false, "pending", { props: null }, { props: { id: "ferry" } }, { id: "palace" }]), [{ id: "ferry" }, { id: "palace" }]);
  const partial = renderToStaticMarkup(<InlineText text="Start with **coffee" />);
  assert.equal(partial, "Start with **coffee");
});

test("inline emphasis and source links render without allowing HTML injection", () => {
  const output = renderToStaticMarkup(<InlineText text={'Visit **the waterfront** and [the museum](https://example.com/museum). <script>alert(1)</script>'} />);
  assert.match(output, /<strong>the waterfront<\/strong>/);
  assert.match(output, /href="https:\/\/example\.com\/museum"/);
  assert.match(output, /rel="noreferrer"/);
  assert.match(output, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(output, /<script>/);
});
