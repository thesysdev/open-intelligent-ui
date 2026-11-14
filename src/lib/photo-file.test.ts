import { describe, expect, it } from "vitest";
import { isPhotoFile } from "./photo-file";

const commons = (name: string) => `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/${name}/960px-${name}`;

describe("isPhotoFile", () => {
  it.each(["Chen_Mapo_Tofu.jpg", "Maple_syrup.jpg", "Flagstaff_skyline.jpg", "Silicon_Valley%2C_facing_southward.jpg", "Iconic_view.jpg", "Sealand_fort.jpg"])(
    "keeps %s, whose name only contains a skipped word",
    (name) => expect(isPhotoFile(commons(name))).toBe(true),
  );

  it.each([
    "Flag_of_Arizona.svg.png",
    "Seattle_location_map.png",
    "Map_of_Sichuan.png",
    "Seal_of_California.png",
    "Coat_of_arms_of_Lisbon.png",
    "Wikipedia-logo-v2.png",
    "Commons-icons.png",
    "LocatorMap.png",
    "Tower.svg",
  ])("skips %s", (name) => expect(isPhotoFile(commons(name))).toBe(false));
});
