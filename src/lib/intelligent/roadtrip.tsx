"use client";

import { defineComponent } from "@openuidev/react-lang";
import { useEffect, useId, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { z } from "zod/v4";
import { fetchWiki } from "../route/store";

type TripDay = {
  day: number;
  name: string;
  region: string;
  category: "City" | "Mountains" | "Forest" | "Coast";
  wiki: string;
  lat: number;
  lng: number;
  description: string;
  stay: string;
  highlight: string;
};
export const pacificNorthwestDays: TripDay[] = [
  {
    day: 1,
    name: "Ease into Seattle",
    region: "Seattle, Washington",
    category: "City",
    wiki: "Seattle",
    lat: 47.6062,
    lng: -122.3321,
    description:
      "Start with the waterfront and Pike Place Market. Leave time for a good coffee and a slow wander through the neighborhoods.",
    stay: "Seattle",
    highlight: "An unhurried first day",
  },
  {
    day: 2,
    name: "The Olympic Peninsula",
    region: "Port Angeles & Hurricane Ridge",
    category: "Mountains",
    wiki: "Hurricane Ridge",
    lat: 47.969,
    lng: -123.498,
    description:
      "Head toward Port Angeles and the Olympic Mountains. Choose a mountain viewpoint when conditions allow, with a lower-elevation alternative ready.",
    stay: "Port Angeles",
    highlight: "Mountain views, weather permitting",
  },
  {
    day: 3,
    name: "Blue water, deep green forest",
    region: "Lake Crescent",
    category: "Forest",
    wiki: "Lake Crescent",
    lat: 48.06,
    lng: -123.799,
    description:
      "Spend the day around Lake Crescent. Walk beside the water, find a quiet picnic spot and take a forest trail at your own pace.",
    stay: "Port Angeles or Lake Crescent",
    highlight: "Lakeside walks and a picnic",
  },
  {
    day: 4,
    name: "A walk through the rainforest",
    region: "Hoh Rain Forest",
    category: "Forest",
    wiki: "Hoh Rainforest",
    lat: 47.861,
    lng: -123.934,
    description:
      "Explore the moss-covered trails of the Hoh Rain Forest. Keep this day focused on the forest, with time for the journey around the peninsula.",
    stay: "Forks",
    highlight: "A slow day under the canopy",
  },
  {
    day: 5,
    name: "Meet the wild Pacific",
    region: "Ruby Beach & the Washington coast",
    category: "Coast",
    wiki: "Ruby Beach",
    lat: 47.709,
    lng: -124.415,
    description:
      "Trade towering trees for sea stacks and driftwood. Follow the coast south, stopping where the light and tides make it worthwhile.",
    stay: "Southwest Washington coast",
    highlight: "Sea stacks and salt air",
  },
  {
    day: 6,
    name: "Cross into Oregon",
    region: "Astoria",
    category: "City",
    wiki: "Astoria, Oregon",
    lat: 46.1879,
    lng: -123.8313,
    description:
      "Follow the Columbia River into Astoria. Explore the riverfront and its maritime history before settling in for the evening.",
    stay: "Astoria",
    highlight: "Riverfront history and a coastal town",
  },
  {
    day: 7,
    name: "An Oregon coast kind of day",
    region: "Cannon Beach",
    category: "Coast",
    wiki: "Haystack Rock",
    lat: 45.884,
    lng: -123.968,
    description:
      "Take a long beach walk with Haystack Rock in view. Leave room for a scenic coastal stop, a warm drink and a little doing nothing.",
    stay: "Cannon Beach",
    highlight: "Beach walks and a sunset",
  },
  {
    day: 8,
    name: "A little time in Portland",
    region: "Portland, Oregon",
    category: "City",
    wiki: "Portland, Oregon",
    lat: 45.5152,
    lng: -122.6784,
    description:
      "Head inland for neighborhood exploring, independent bookshops and a relaxed food stop. Make Portland your base for the final days.",
    stay: "Portland",
    highlight: "Books, coffee and neighborhood wandering",
  },
  {
    day: 9,
    name: "Follow the Columbia River",
    region: "Columbia River Gorge",
    category: "Forest",
    wiki: "Multnomah Falls",
    lat: 45.5785,
    lng: -122.1158,
    description:
      "Follow the Gorge for waterfall viewpoints and river scenery. Check access and reservation requirements for the stops you choose.",
    stay: "Portland or Hood River",
    highlight: "Waterfalls and big river views",
  },
  {
    day: 10,
    name: "One last mountain view",
    region: "Mount Hood → Portland",
    category: "Mountains",
    wiki: "Mount Hood",
    lat: 45.3735,
    lng: -121.6959,
    description:
      "If weather and your departure time allow, spend a final morning near Mount Hood. Otherwise keep the day easy in Portland before heading home.",
    stay: "Departure day",
    highlight: "A flexible finish",
  },
];
const dollars = (number: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(number);

function PlacePhoto({ day }: { day: TripDay }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetchWiki(day.wiki).then((info) => {
      if (live && info.photos[0]) setSrc(info.photos[0]);
    });
    return () => {
      live = false;
    };
  }, [day.wiki]);
  return (
    <div className="iui-trip-photo">
      {src && !failed ? (
        <img
          src={src}
          alt={day.region}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <svg
          viewBox="0 0 300 200"
          role="img"
          aria-label={`${day.category} landscape illustration`}
        >
          <rect width="300" height="200" fill="#dfe7e5" />
          <path d="M0 135 90 49 172 122 235 72 300 128V200H0Z" fill="#98ada4" />
          <path d="m60 78 30-29 31 29-15-5-14 9-15-8Z" fill="#f5f4e9" />
          <path
            d="M0 149q90-49 165 1t135-18v68H0Z"
            fill={day.category === "Coast" ? "#648f9e" : "#708c76"}
          />
          <path
            d="M0 177q95-14 162 1t138-8v30H0Z"
            fill={day.category === "Coast" ? "#c7d5d6" : "#4f715b"}
          />
        </svg>
      )}
      <a
        href={`https://en.wikipedia.org/wiki/${encodeURIComponent(day.wiki.replace(/ /g, "_"))}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Photo and information about ${day.region}`}
      >
        ↗
      </a>
    </div>
  );
}

function TripMap({
  days,
  selected,
  onSelect,
}: {
  days: TripDay[];
  selected: number;
  onSelect: (day: number) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<LayerGroup | null>(null);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    let live = true;
    import("leaflet").then((module) => {
      if (live) setL(module.default ?? module);
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!L || !element.current) return;
    const instance = L.map(element.current, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView([46.8, -123], 6);
    map.current = instance;
    instance.attributionControl.setPrefix(false);
    const tiles = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles &copy; Esri", maxZoom: 16 },
    ).addTo(instance);
    tiles.on("tileerror", () => setTileError(true));
    markers.current = L.layerGroup().addTo(instance);
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      markers.current = null;
    };
  }, [L]);
  useEffect(() => {
    if (!L || !map.current || !markers.current) return;
    markers.current.clearLayers();
    const points: [number, number][] = days.map((day) => [day.lat, day.lng]);
    if (points.length > 1)
      L.polyline(points, {
        color: "#39765c",
        weight: 2.5,
        dashArray: "5 7",
        opacity: 0.7,
      }).addTo(markers.current);
    days.forEach((day) => {
      const icon = L.divIcon({
        className: "",
        html: `<span class="iui-trip-pin${selected === day.day ? " is-selected" : ""}">${day.day}</span>`,
        iconSize: [29, 29],
        iconAnchor: [14, 14],
      });
      L.marker([day.lat, day.lng], {
        icon,
        title: `Day ${day.day}: ${day.region}`,
        keyboard: true,
      })
        .addTo(markers.current!)
        .on("click", () => onSelect(day.day));
    });
    if (points.length)
      map.current.fitBounds(L.latLngBounds(points).pad(0.16), {
        animate: false,
        maxZoom: 10,
      });
  }, [L, days, selected, onSelect]);
  return (
    <div className="iui-trip-map-wrap">
      <div
        ref={element}
        className="iui-trip-map"
        role="img"
        aria-label={`Pacific Northwest route map with ${days.length} day stops`}
      />
      <span className="iui-trip-map-chip">{days.length} stops</span>
      {tileError && (
        <span className="iui-trip-map-error">
          Map imagery unavailable. Your stops are listed below.
        </span>
      )}
    </div>
  );
}

export function PacificNorthwestRoadTripView({
  title = "10 days in the Pacific Northwest",
}: { title?: string } = {}) {
  const id = useId();
  const [filter, setFilter] = useState("All stops");
  const [selected, setSelected] = useState(1);
  const [removed, setRemoved] = useState<number[]>([]);
  const [season, setSeason] = useState("Summer");
  const [style, setStyle] = useState("Balanced");
  const [party, setParty] = useState("2 people");
  const [applied, setApplied] = useState({
    season: "Summer",
    style: "Balanced",
    party: "2 people",
  });
  const [copyStatus, setCopyStatus] = useState("");
  const active = pacificNorthwestDays.filter(
    (day) => !removed.includes(day.day),
  );
  const visible = active.filter(
    (day) => filter === "All stops" || day.category === filter,
  );
  const current = visible.find((day) => day.day === selected) || visible[0];
  const count = Number.parseInt(applied.party);
  const lodgingNight =
    applied.style === "Budget-minded"
      ? 130
      : applied.style === "Comfort first"
        ? 280
        : 190;
  const rooms = Math.ceil(count / 2);
  const nights = Math.max(0, active.length - 1);
  const budget = [
    {
      category: "Places to stay",
      calculation: `${nights} nights × ${dollars(lodgingNight)} × ${rooms} ${rooms === 1 ? "room" : "rooms"}`,
      total: nights * lodgingNight * rooms,
    },
    {
      category: "Rental car & fuel",
      calculation: `${active.length} days · one vehicle`,
      total: active.length ? active.length * 85 + 180 : 0,
    },
    {
      category: "Food & coffee",
      calculation: `${active.length} days × ${dollars(applied.style === "Budget-minded" ? 40 : applied.style === "Comfort first" ? 85 : 60)} × ${count} people`,
      total:
        active.length *
        count *
        (applied.style === "Budget-minded"
          ? 40
          : applied.style === "Comfort first"
            ? 85
            : 60),
    },
    {
      category: "Activities & parking",
      calculation: "A little room for the extras",
      total: active.length ? count * 100 : 0,
    },
  ];
  const total = budget.reduce((sum, item) => sum + item.total, 0);
  const seasonNote =
    applied.season === "Summer"
      ? "Build in time for busy park entrances and reserve your stays ahead. Keep a rain layer in the car, even in summer."
      : applied.season === "Spring"
        ? "Make the coast and lower-elevation forest your anchors. Keep mountain days flexible around snow and road access."
        : applied.season === "Autumn"
          ? "Leave room for changing weather and shorter days. Swap a mountain stop for a city or coastal day if conditions turn."
          : "Use the city and coast stops as your base. Mountain roads and trails can require winter equipment or be inaccessible; check official conditions before committing.";
  const copyText = `${title}\n${applied.party} · ${applied.season} · ${applied.style}\n\n${active.map((day) => `Day ${day.day}: ${day.region}\n${day.description}\nStay: ${day.stay}`).join("\n\n")}\n\nIllustrative trip budget: ${dollars(total)} total / ${dollars(total / count)} per person. Excludes flights.\n${seasonNote}`;
  return (
    <section className="iui iui-trip" aria-label="Pacific Northwest road trip">
      <header>
        <h2>{title || "10 days in the Pacific Northwest"}</h2>
        <p>
          City mornings, old-growth forests and the kind of coastline that makes
          you pull over. Here’s a route with room to take it all in.
        </p>
      </header>
      <div className="iui-trip-photo-strip">
        {[
          pacificNorthwestDays[0],
          pacificNorthwestDays[3],
          pacificNorthwestDays[6],
        ].map((day) => (
          <PlacePhoto day={day} key={day.day} />
        ))}
      </div>
      <div className="iui-trip-meta">
        <span>
          {active.length} days · {nights} nights
        </span>
        <span>Seattle → Portland</span>
        <span>Road trip</span>
      </div>
      <section className="iui-panel iui-trip-route">
        <div className="iui-trip-section-heading">
          <div>
            <h3>Your route at a glance</h3>
            <p>Choose a stop to see what’s waiting there.</p>
          </div>
          <span className="iui-trip-caption">Washington & Oregon</span>
        </div>
        <div className="iui-trip-filters" aria-label="Filter route stops">
          {["All stops", "City", "Mountains", "Forest", "Coast"].map(
            (value) => (
              <button
                type="button"
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value}
              </button>
            ),
          )}
        </div>
        <TripMap
          days={visible}
          selected={current?.day || 0}
          onSelect={setSelected}
        />
        {current ? (
          <div className="iui-trip-selected">
            <span className="iui-trip-day-number">{current.day}</span>
            <div>
              <strong>{current.region}</strong>
              <p>{current.highlight}</p>
            </div>
            <button
              type="button"
              className="iui-button"
              onClick={() =>
                document
                  .getElementById(`${id}-day-${current.day}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            >
              View day <span aria-hidden="true">↓</span>
            </button>
          </div>
        ) : (
          <p className="iui-trip-caption">
            No active stops in this category. Add a day back below or choose
            another filter.
          </p>
        )}
      </section>
      <section className="iui-trip-days">
        <div className="iui-trip-section-heading">
          <div>
            <h3>Ten days, one good adventure</h3>
            <p>A suggested pace. Make room for the stops you love.</p>
          </div>
          <span className="iui-trip-caption">
            {active.length} days in your plan
          </span>
        </div>
        {pacificNorthwestDays.map((day) => (
          <article
            className={removed.includes(day.day) ? "is-removed" : ""}
            key={day.day}
            id={`${id}-day-${day.day}`}
          >
            <PlacePhoto day={day} />
            <div>
              <div className="iui-trip-day-kicker">
                Day {day.day} <span>· {day.category}</span>
              </div>
              <h4>{day.name}</h4>
              <p>{day.description}</p>
              <span className="iui-trip-stay">Stay: {day.stay}</span>
              <button
                type="button"
                className="iui-trip-remove"
                aria-pressed={!removed.includes(day.day)}
                onClick={() =>
                  setRemoved((current) =>
                    current.includes(day.day)
                      ? current.filter((value) => value !== day.day)
                      : [...current, day.day],
                  )
                }
              >
                {removed.includes(day.day)
                  ? "+ Add back to my trip"
                  : "− Remove from my trip"}
              </button>
            </div>
          </article>
        ))}
      </section>
      <section className="iui-panel iui-trip-budget">
        <div className="iui-trip-section-heading">
          <div>
            <h3>A little budget planning</h3>
            <p>
              Illustrative costs for {applied.party.toLowerCase()}, traveling{" "}
              {applied.style.toLowerCase()}.
            </p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th scope="col">What</th>
              <th scope="col">Assumption</th>
              <th scope="col">Estimate</th>
            </tr>
          </thead>
          <tbody>
            {budget.map((row) => (
              <tr key={row.category}>
                <th scope="row">{row.category}</th>
                <td>{row.calculation}</td>
                <td>{dollars(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Estimated total</th>
              <td>{dollars(total / count)} per person</td>
              <td>{dollars(total)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="iui-trip-caption">
          Planning assumptions, not live quotes. Excludes flights, insurance and
          any one-way rental fee. Prices vary by dates and availability.
        </p>
      </section>
      <section className="iui-panel iui-trip-preferences">
        <h3>Make this trip yours</h3>
        <p>A few details help the plan fit how you like to travel.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setApplied({ season, style, party });
            setCopyStatus("");
          }}
        >
          {[
            {
              name: "season",
              label: "When are you going?",
              options: ["Spring", "Summer", "Autumn", "Winter"],
              value: season,
              set: setSeason,
            },
            {
              name: "style",
              label: "What’s your travel style?",
              options: ["Budget-minded", "Balanced", "Comfort first"],
              value: style,
              set: setStyle,
            },
            {
              name: "party",
              label: "Who’s coming along?",
              options: ["1 person", "2 people", "4 people"],
              value: party,
              set: setParty,
            },
          ].map((group) => (
            <fieldset key={group.name}>
              <legend>{group.label}</legend>
              {group.options.map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name={`${id}-${group.name}`}
                    value={option}
                    checked={group.value === option}
                    onChange={() => group.set(option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <button type="submit" className="iui-button iui-primary">
            Personalize my trip <span aria-hidden="true">↗</span>
          </button>
        </form>
        <div className="iui-trip-season-note" role="status">
          <strong>
            {applied.season} · {applied.party} · {applied.style}
          </strong>
          <p>{seasonNote}</p>
        </div>
      </section>
      <footer className="iui-trip-footer">
        <p>
          Before you go, check{" "}
          <a
            href="https://www.nps.gov/olym/planyourvisit/conditions.htm"
            target="_blank"
            rel="noreferrer"
          >
            Olympic park conditions
          </a>{" "}
          and{" "}
          <a href="https://www.tripcheck.com/" target="_blank" rel="noreferrer">
            Oregon road conditions
          </a>
          . Photos and destination information via Wikipedia.
        </p>
        <button
          type="button"
          className="iui-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(copyText);
              setCopyStatus("Copied itinerary");
            } catch {
              setCopyStatus("Select the itinerary below to copy.");
            }
          }}
        >
          {copyStatus === "Copied itinerary"
            ? "Copied itinerary ✓"
            : "Copy my itinerary"}
        </button>
        {copyStatus === "Select the itinerary below to copy." && (
          <label className="iui-trip-copy-fallback">
            {copyStatus}
            <textarea
              readOnly
              value={copyText}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
        )}
      </footer>
    </section>
  );
}

export const RoadTripPlanner = defineComponent({
  name: "RoadTripPlanner",
  description:
    "A specific ten-day Pacific Northwest road-trip experience from Seattle through Olympic Peninsula and Oregon coast to Portland, the Columbia Gorge and Mount Hood. Includes real map filters, destination photos, ten editable day stops, party-size and travel-style budget assumptions, seasonal preferences and copyable itinerary. Use ONLY for this Pacific Northwest example. For arbitrary destinations use RouteMap, RouteStops and RouteSuggestions instead.",
  props: z.object({ title: z.string() }),
  component: ({ props }) => (
    <PacificNorthwestRoadTripView title={props.title} />
  ),
});
