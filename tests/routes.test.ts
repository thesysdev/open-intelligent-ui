import assert from "node:assert/strict";
import { createRouteStore, getStopKey } from "../src/lib/route/store";

const first = createRouteStore("first-response");
const second = createRouteStore("second-response");
let firstUpdates = 0;
let secondUpdates = 0;
const unsubscribeFirst = first.subscribe(() => { firstUpdates++; });
const unsubscribeSecond = second.subscribe(() => { secondUpdates++; });

first.toggleStop("Central station");
assert.equal(first.isRemoved("Central station"), true);
assert.equal(second.isRemoved("Central station"), false);
assert.equal(firstUpdates, 1);
assert.equal(secondUpdates, 0);

first.addStop({ id: "museum", name: "City museum", lat: 1, lng: 2 });
assert.equal(first.isAdded("museum"), true);
assert.equal(second.isAdded("museum"), false);
assert.equal(second.getAdded().length, 0);
assert.notEqual(first.mapId, second.mapId);
assert.notEqual(first.stopId("Central station"), second.stopId("Central station"));
assert.notEqual(first.stopId("A/B"), first.stopId("A B"));

first.addStop({ id: "outbound", name: "Airport" });
first.addStop({ id: "return", name: "Airport" });
assert.equal(first.getAdded().filter((stop) => stop.name === "Airport").length, 2, "Repeated visits with separate ids stay distinct.");
first.addStop({ id: "outbound", name: "Airport" });
assert.equal(first.getAdded().length, 3, "Adding a suggestion twice is idempotent.");
assert.equal(getStopKey({ name: "Central station" }), "Central station");
assert.equal(getStopKey({ id: "arrival", name: "Central station" }), "arrival");

first.toggleStop("Central station");
assert.equal(first.isRemoved("Central station"), false);
const beforeUnsubscribe = firstUpdates;
unsubscribeFirst();
unsubscribeSecond();
first.toggleStop("Central station");
assert.equal(firstUpdates, beforeUnsubscribe);
assert.equal(second.getSnapshot(), 0);
console.log("PASS route response isolation, scoped ids, repeated visits, subscriptions and suggestion deduplication");
