const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
export const TOOLS = [
  {
    id: "select",
    name: "Select",
    key: "V",
    icon: icon('<path d="m5 3 14 10-7 1-3 7Z"/>'),
  },
  {
    id: "nodes",
    name: "Edit path nodes",
    key: "A",
    icon: icon('<path d="m5 3 12 12-6-1-3 6Z"/><circle cx="18" cy="5" r="2"/>'),
  },
  {
    id: "hand",
    name: "Pan canvas",
    key: "H",
    icon: icon(
      '<path d="M6 12V7a2 2 0 0 1 4 0V5a2 2 0 0 1 4 0v2a2 2 0 0 1 4 0v4a2 2 0 0 1 3 2v3q-1 5-6 5h-2q-3 0-5-3l-5-5q0-3 3-1Z"/>',
    ),
  },
  {
    id: "pen",
    name: "Pen / Bézier path",
    key: "P",
    icon: icon(
      '<path d="m4 20 4-13 9-3 3 9-13 7Z"/><path d="m4 20 8-8"/><circle cx="13" cy="11" r="2"/>',
    ),
  },
  {
    id: "freehand",
    name: "Freehand pencil",
    key: "B",
    icon: icon(
      '<path d="m4 20 1-5L17 3l4 4L9 19Z"/><path d="m14 6 4 4M5 15l4 4"/>',
    ),
  },
  {
    id: "rect",
    name: "Rectangle",
    key: "R",
    icon: icon('<rect x="4" y="5" width="16" height="14" rx="2"/>'),
  },
  {
    id: "ellipse",
    name: "Ellipse",
    key: "E",
    icon: icon('<ellipse cx="12" cy="12" rx="8" ry="7"/>'),
  },
  {
    id: "text",
    name: "Text label",
    key: "T",
    icon: icon('<path d="M4 7V4h16v3M12 4v16M8 20h8"/>'),
  },
];
