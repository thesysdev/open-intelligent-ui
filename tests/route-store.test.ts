import assert from "node:assert/strict";
import test from "node:test";
import { createRouteStore, getStopKey } from "../src/lib/route/store";

test("map selection, removals and additions stay inside their own response", () => {
  const first = createRouteStore("response-one");
  const second = createRouteStore("response-two");
  first.selectStop("museum");
  first.toggleStop("museum");
  first.addStop({ id: "park", name: "City park", lat: 37.8, lng: -122.4 });
  assert.equal(first.getSelected(), "museum");
  assert.equal(first.isRemoved("museum"), true);
  assert.equal(first.isAdded("park"), true);
  assert.equal(second.getSelected(), null);
  assert.equal(second.isRemoved("museum"), false);
  assert.deepEqual(second.getAdded(), []);
  assert.equal(second.getSnapshot(), 0);
  first.selectStop(null);
  assert.equal(first.getSelected(), null);
});

test("stable ids keep repeated place names and separate map/card anchors distinct", () => {
  const first = createRouteStore("first");
  const second = createRouteStore("second");
  first.addStop({ id: "arrival", name: "Central station" });
  first.addStop({ id: "departure", name: "Central station" });
  assert.equal(first.getAdded().length, 2);
  first.toggleStop("arrival");
  assert.equal(first.isRemoved("arrival"), true);
  assert.equal(first.isRemoved("departure"), false);
  assert.notEqual(first.mapId, second.mapId);
  assert.notEqual(first.stopId("arrival"), second.stopId("arrival"));
  assert.notEqual(first.stopId("A/B"), first.stopId("A B"));
  assert.equal(getStopKey({ id: "arrival", name: "Central station" }), "arrival");
  assert.equal(getStopKey({ name: "Central station" }), "Central station");
});

test("suggestions are copied, deduplicated, and observable without leaked subscriptions", () => {
  const store = createRouteStore("trip");
  const revisions: number[] = [];
  const unsubscribe = store.subscribe(() => revisions.push(store.getSnapshot()));
  const suggestion = { id: "garden", name: "Botanical garden" };
  store.toggleStop("garden");
  store.addStop(suggestion);
  suggestion.name = "Changed by the caller";
  assert.equal(store.getAdded()[0].name, "Botanical garden");
  assert.equal(store.isRemoved("garden"), false);
  const beforeDuplicate = store.getSnapshot();
  store.addStop({ id: "garden", name: "Same destination" });
  store.addStop({});
  store.toggleStop("");
  assert.equal(store.getAdded().length, 1);
  assert.equal(store.getSnapshot(), beforeDuplicate);
  assert.deepEqual(revisions, [1, 2]);
  unsubscribe();
  store.selectStop("garden");
  assert.deepEqual(revisions, [1, 2]);
});
