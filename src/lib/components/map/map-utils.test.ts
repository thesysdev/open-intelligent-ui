import { describe, expect, it } from "vitest";
import { boundsOf, type LatLng } from "./map-utils";

describe("boundsOf", () => {
  it("frames nearby places on opposite sides of the antimeridian", () => {
    expect(boundsOf([[-16, 179], [-17, -179]])).toEqual([[179, -17], [181, -16]]);
  });

  it("keeps ordinary city coordinates in their original world copy", () => {
    expect(boundsOf([[37.8, -122.5], [37.7, -122.3]])).toEqual([[-122.5, 37.7], [-122.3, 37.8]]);
  });

  it("includes every place in the smallest circular longitude interval", () => {
    const points: LatLng[] = [[10, 170], [-10, -175], [20, 178], [0, -178]];
    const [[west, south], [east, north]] = boundsOf(points) as [[number, number], [number, number]];
    expect(east - west).toBe(15);
    expect([south, north]).toEqual([-10, 20]);
    for (const [, lng] of points) {
      const inFrame = [lng - 360, lng, lng + 360].some((value) => value >= west && value <= east);
      expect(inFrame).toBe(true);
    }
    expect(boundsOf([...points].reverse())).toEqual(boundsOf(points));
  });

  it("frames a single place and duplicate longitudes without widening", () => {
    expect(boundsOf([[1, -179], [2, -179]])).toEqual([[-179, 1], [-179, 2]]);
  });
});
