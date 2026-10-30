import { emptyProject, makeNode } from "./model.mjs";
import { translate } from "./geometry.mjs";
const rect = (name, x, y, w, h, fill, stroke = "#263b37", extra = {}) =>
  makeNode("rect", {
    name,
    matrix: translate(x, y),
    width: w,
    height: h,
    fill,
    stroke,
    ...extra,
  });
const ellipse = (name, x, y, w, h, fill, extra = {}) =>
  makeNode("ellipse", {
    name,
    matrix: translate(x, y),
    width: w,
    height: h,
    fill,
    stroke: "none",
    ...extra,
  });
const path = (name, points, fill, extra = {}) =>
  makeNode("path", {
    name,
    points: points.map((p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : p)),
    fill,
    closed: true,
    ...extra,
  });
const text = (name, x, y, value, size, fill = "#263b37", extra = {}) =>
  makeNode("text", {
    name,
    matrix: translate(x, y),
    text: value,
    fontSize: size,
    fill,
    width: value.length * size * 0.6,
    height: size * 1.3,
    ...extra,
  });
const group = (name, x, y, children, extra = {}) =>
  makeNode("group", { name, matrix: translate(x, y), children, ...extra });

export function demoProject() {
  const p = emptyProject("The Lantern Workshop");
  p.background = "#f4ecd9";
  p.sources = [
    {
      id: "workshop-source",
      title: "Original nonmedical workshop description",
      sha256:
        "92b03b024b4451a84fae5d4dc6b5817dd033a2f3418842f7cfec9366fddf738a",
      userProvided: false,
      excerpts: {
        "scene description":
          "A lantern hangs beside the workshop door. A map lies on the worktable. A plant grows in a terracotta pot.",
      },
    },
  ];
  p.facts = [
    ["lantern-fact", "A lantern hangs beside the workshop door."],
    ["map-fact", "A map lies on the worktable."],
    ["plant-fact", "A plant grows in a terracotta pot."],
  ].map(([id, text]) => ({
    id,
    text,
    sources: [
      {
        sourceId: "workshop-source",
        locator: "scene description",
        quote: text,
      },
    ],
  }));
  const backdrop = group(
    "Background • courtyard",
    0,
    0,
    [
      rect("Sky", 0, 0, 1600, 900, "#f4ecd9", "none"),
      ellipse("Sun", 1240, 92, 155, 155, "#e7bf76"),
      path(
        "Distant hill",
        [
          [-30, 515],
          { x: 450, y: 392, out: { x: 750, y: 245 } },
          { x: 980, y: 440, out: { x: 1180, y: 280 } },
          { x: 1630, y: 380 },
          [1630, 900],
          [-30, 900],
        ],
        "#c6d7bf",
        { stroke: "none" },
      ),
      rect("Courtyard ground", 0, 643, 1600, 257, "#dce2cb", "none"),
      path(
        "Winding path",
        [
          [1075, 900],
          [1370, 900],
          { x: 1070, y: 655, in: { x: 1330, y: 720 } },
          [860, 655],
          { x: 1075, y: 900, in: { x: 910, y: 770 } },
        ],
        "#ebd4a7",
        { stroke: "none" },
      ),
      ellipse("Cloud one", 160, 120, 210, 53, "#fffaf0"),
      ellipse("Cloud two", 1040, 225, 190, 45, "#fffaf0"),
      path(
        "Garden ridge",
        [
          [0, 760],
          { x: 400, y: 730, out: { x: 720, y: 775 } },
          [1600, 785],
          [1600, 900],
          [0, 900],
        ],
        "#bed0b7",
        { stroke: "none" },
      ),
    ],
    { locked: true, role: "background" },
  );
  const house = group("Workshop • stone and timber", 170, 250, [
    rect("Plaster wall", 60, 105, 550, 390, "#e8d7b5", "#34463e", {
      radius: 8,
      strokeWidth: 5,
    }),
    path(
      "Terracotta roof",
      [
        [0, 120],
        [320, -50],
        [665, 120],
      ],
      "#b9714e",
      { strokeWidth: 7 },
    ),
    path(
      "Roof edge",
      [
        [30, 120],
        [320, -20],
        [635, 120],
      ],
      "none",
      { closed: false, stroke: "#e1aa73", strokeWidth: 10 },
    ),
    rect("Door recess", 130, 235, 160, 260, "#5b7466", "#34463e", {
      radius: 80,
      strokeWidth: 5,
    }),
    rect("Door", 140, 270, 140, 225, "#91a08a", "#34463e", {
      radius: 8,
      strokeWidth: 5,
    }),
    rect("Door plank", 168, 280, 3, 210, "#5b7466", "none"),
    rect("Door plank", 210, 280, 3, 210, "#5b7466", "none"),
    ellipse("Door handle", 248, 381, 16, 16, "#e8ba66", {
      stroke: "#34463e",
      strokeWidth: 3,
    }),
    rect("Window frame", 365, 200, 160, 138, "#e8ba66", "#34463e", {
      radius: 50,
      strokeWidth: 6,
    }),
    rect("Window mullion", 439, 203, 10, 130, "#34463e", "none"),
    rect("Window rail", 367, 262, 155, 9, "#34463e", "none"),
    rect("Window sill", 344, 336, 200, 20, "#95694b", "#34463e", {
      radius: 4,
      strokeWidth: 4,
    }),
    rect("Doorstep", 95, 482, 230, 26, "#c1b293", "#34463e", {
      radius: 5,
      strokeWidth: 4,
    }),
    text("Workshop sign", 160, 151, "WORKSHOP", 26, "#34463e", {
      fontWeight: "700",
    }),
  ]);
  const lantern = group(
    "Lantern • light and welcome",
    762,
    310,
    [
      ellipse("Warm glow", -70, 20, 250, 300, "#f1d38a", { opacity: 0.5 }),
      path(
        "Hanging bracket",
        [
          [0, 0],
          [55, 0],
          [55, 65],
        ],
        "none",
        { closed: false, strokeWidth: 8 },
      ),
      ellipse("Hanging ring", 37, 58, 36, 36, "none", {
        stroke: "#34463e",
        strokeWidth: 6,
      }),
      path(
        "Lantern roof",
        [
          [5, 117],
          [55, 82],
          [105, 117],
        ],
        "#526f60",
        { strokeWidth: 5 },
      ),
      rect("Glowing glass", 15, 117, 80, 120, "#edc165", "#34463e", {
        radius: 8,
        strokeWidth: 5,
      }),
      path(
        "Lantern crossbar",
        [
          [15, 117],
          [95, 237],
          [15, 237],
          [95, 117],
        ],
        "none",
        { closed: false, strokeWidth: 4 },
      ),
      rect("Lantern base", 5, 236, 100, 14, "#526f60", "#34463e", {
        radius: 4,
        strokeWidth: 4,
      }),
    ],
    { factIds: ["lantern-fact"] },
  );
  const table = group("Worktable", 950, 520, [
    ellipse("Table shadow", -35, 230, 500, 58, "#a6b79c", { opacity: 0.5 }),
    rect("Left leg", 40, 80, 32, 175, "#8e6d4d", "#34463e", { strokeWidth: 5 }),
    rect("Right leg", 350, 80, 32, 175, "#8e6d4d", "#34463e", {
      strokeWidth: 5,
    }),
    rect("Table top", 0, 50, 430, 46, "#b68c5f", "#34463e", {
      radius: 8,
      strokeWidth: 5,
    }),
    rect("Cross brace", 65, 180, 290, 20, "#9f7b55", "#34463e", {
      strokeWidth: 4,
    }),
  ]);
  const map = group(
    "Map • a route to remember",
    1012,
    507,
    [
      path(
        "Parchment",
        [
          [0, 0],
          [250, -7],
          [290, 55],
          [35, 65],
        ],
        "#fff4d6",
        { strokeWidth: 4 },
      ),
      path(
        "Route",
        [
          [50, 39],
          { x: 105, y: 24, out: { x: 120, y: 0 } },
          { x: 175, y: 27, out: { x: 195, y: 55 } },
          [230, 22],
        ],
        "none",
        { closed: false, stroke: "#c57752", strokeWidth: 5 },
      ),
      ellipse("Starting point", 43, 31, 14, 14, "#547e69"),
      ellipse("Destination", 221, 14, 17, 17, "#c57752"),
    ],
    { factIds: ["map-fact"] },
  );
  const plant = group(
    "Plant • steady growth",
    480,
    660,
    [
      ellipse("Pot shadow", -8, 118, 135, 24, "#9cb194", { opacity: 0.6 }),
      path(
        "Terracotta pot",
        [
          [10, 45],
          [112, 45],
          [94, 124],
          [29, 124],
        ],
        "#c98560",
        { strokeWidth: 5 },
      ),
      rect("Pot rim", 1, 36, 122, 20, "#db9b72", "#34463e", {
        radius: 5,
        strokeWidth: 4,
      }),
      path(
        "Stem",
        [
          [59, 37],
          [59, -78],
        ],
        "none",
        { closed: false, stroke: "#385d49", strokeWidth: 6 },
      ),
      path(
        "Left leaf",
        [
          [58, -15],
          { x: -4, y: -65, out: { x: 43, y: -77 } },
          { x: 58, y: -15 },
        ],
        "#638a61",
        { stroke: "#385d49", strokeWidth: 3 },
      ),
      path(
        "Right leaf",
        [
          [60, -42],
          { x: 123, y: -101, out: { x: 110, y: -25 } },
          { x: 60, y: -42 },
        ],
        "#91ae71",
        { stroke: "#385d49", strokeWidth: 3 },
      ),
    ],
    { factIds: ["plant-fact"] },
  );
  p.nodes = [
    backdrop,
    house,
    table,
    map,
    plant,
    lantern,
    text("Scene title", 83, 68, "A place for bright ideas.", 42, "#34463e", {
      fontFamily: "serif",
    }),
    text(
      "Scene subtitle",
      87,
      124,
      "A nonmedical authoring example • every object is editable",
      18,
      "#667565",
    ),
  ];
  const makeCue = (id, start, end, fact, node, caption, camera) => ({
    id,
    startMs: start,
    endMs: end,
    factIds: [fact],
    layerIds: [node.id],
    text: caption,
    camera,
    easing: "EASE_IN_OUT",
  });
  p.tracks.explanation.cues = [
    makeCue(
      "explain-lantern",
      0,
      30000,
      "lantern-fact",
      lantern,
      "A lantern hangs beside the workshop door. Connect the light with its location.",
      { x: 0.31, y: 0.24, width: 0.34, height: 0.5 },
    ),
    makeCue(
      "explain-map",
      30000,
      60000,
      "map-fact",
      map,
      "A map lies on the worktable. Its route gives our scene a second place to explore.",
      { x: 0.55, y: 0.4, width: 0.4, height: 0.5 },
    ),
    makeCue(
      "explain-plant",
      60000,
      90000,
      "plant-fact",
      plant,
      "A plant grows in a terracotta pot. Return to the whole scene and recall all three objects.",
      { x: 0, y: 0, width: 1, height: 1 },
    ),
  ];
  p.tracks.story.cues = [
    makeCue(
      "story-plant",
      0,
      30000,
      "plant-fact",
      plant,
      "At the workshop, a small plant stretches toward the morning light.",
      { x: 0.2, y: 0.5, width: 0.35, height: 0.48 },
    ),
    makeCue(
      "story-lantern",
      30000,
      60000,
      "lantern-fact",
      lantern,
      "Beside the door, a lantern welcomes the next visitor.",
      { x: 0.31, y: 0.24, width: 0.34, height: 0.5 },
    ),
    makeCue(
      "story-map",
      60000,
      90000,
      "map-fact",
      map,
      "A map waits on the worktable, ready to lead the visitor on a new journey.",
      { x: 0.55, y: 0.4, width: 0.4, height: 0.5 },
    ),
  ];
  for (const mode of ["explanation", "story"])
    lantern.motion[mode] = [
      { atMs: 0, dx: 0, dy: 0, scale: 1, rotation: 0 },
      { atMs: 45000, dx: 0, dy: -3, scale: 1.025, rotation: 0 },
      { atMs: 90000, dx: 0, dy: 0, scale: 1, rotation: 0 },
    ];
  return p;
}
