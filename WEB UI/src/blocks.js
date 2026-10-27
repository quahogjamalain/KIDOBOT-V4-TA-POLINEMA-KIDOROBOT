import * as Blockly from "blockly";
import "blockly/blocks";
import * as Id from "blockly/msg/id";
import { Order, javascriptGenerator } from "blockly/javascript";

Blockly.setLocale(Id);

export const PALETTE_CATEGORIES = [
  { id: "semua", label: "Semua", colour: "#a8bce2" },
  { id: "gerak", label: "Gerak", colour: "#ff8a3d" },
  { id: "kontrol", label: "Kontrol", colour: "#5b8cff" },
  { id: "tampilan", label: "Tampilan", colour: "#a78bfa" },
  { id: "sensor", label: "Sensor", colour: "#22d3c5" },
];

export const PALETTE_BLOCKS = [
  {
    type: "kidobot_start",
    category: "kontrol",
    title: "Ketika dijalankan",
    subtitle: "Blok pembuka program",
    glyph: "\u25b6",
    colour: "#ffcf5c",
  },
  {
    type: "kidobot_move",
    category: "gerak",
    title: "Maju",
    subtitle: "1 petak ke depan",
    glyph: "\u2191",
    colour: "#ff8a3d",
  },
  {
    type: "kidobot_turn",
    category: "gerak",
    title: "Belok",
    subtitle: "Kiri atau kanan",
    glyph: "\u21bb",
    colour: "#ff8a3d",
  },
  {
    type: "kidobot_face",
    category: "gerak",
    title: "Hadap ke arah",
    subtitle: "Utara, timur, selatan, barat",
    glyph: "\u2316",
    colour: "#ff8a3d",
  },
  {
    type: "kidobot_say",
    category: "tampilan",
    title: "Katakan",
    subtitle: "Tampilkan balon kata",
    glyph: "Aa",
    colour: "#a78bfa",
  },
  {
    type: "kidobot_wait",
    category: "kontrol",
    title: "Tunggu",
    subtitle: "Jeda 1 detik",
    glyph: "\u25f7",
    colour: "#5b8cff",
  },
  {
    type: "kidobot_led",
    category: "tampilan",
    title: "Lampu robot",
    subtitle: "Ubah warna LED",
    glyph: "\u25c9",
    colour: "#a78bfa",
  },
  {
    type: "kidobot_repeat",
    category: "kontrol",
    title: "Ulangi",
    subtitle: "Perulangan blok",
    glyph: "\u27f3",
    colour: "#5b8cff",
  },
  {
    type: "kidobot_if_distance",
    category: "sensor",
    title: "Jika jarak",
    subtitle: "Cek sensor jarak",
    glyph: "?",
    colour: "#22d3c5",
  },
];

const BLOCK_STYLES = {
  event_blocks: {
    colourPrimary: "#ffcf5c",
    colourSecondary: "#ffb52e",
    colourTertiary: "#b78500",
  },
  motion_blocks: {
    colourPrimary: "#ff8a3d",
    colourSecondary: "#f06f1d",
    colourTertiary: "#b94808",
  },
  control_blocks: {
    colourPrimary: "#5b8cff",
    colourSecondary: "#4274e8",
    colourTertiary: "#2851ad",
  },
  looks_blocks: {
    colourPrimary: "#a78bfa",
    colourSecondary: "#8d6ff0",
    colourTertiary: "#6647c4",
  },
  sensor_blocks: {
    colourPrimary: "#22d3c5",
    colourSecondary: "#12b9ac",
    colourTertiary: "#087a71",
  },
};

const BLOCK_DEFINITIONS = [
  {
    type: "kidobot_start",
    message0: "ketika \u25b6 dijalankan",
    message1: "lakukan %1",
    args1: [{ type: "input_statement", name: "DO" }],
    style: "event_blocks",
    hat: "cap",
    tooltip: "Titik awal program. Semua blok di bawahnya dijalankan saat tombol Jalankan ditekan.",
  },
  {
    type: "kidobot_move",
    message0: "maju %1 petak",
    args0: [
      {
        type: "field_number",
        name: "STEPS",
        value: 1,
        min: 1,
        max: 20,
        precision: 1,
      },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "motion_blocks",
    tooltip: "Gerakkan robot ke depan sesuai jumlah petak.",
  },
  {
    type: "kidobot_turn",
    message0: "belok %1",
    args0: [
      {
        type: "field_dropdown",
        name: "DIRECTION",
        options: [
          ["kiri", "left"],
          ["kanan", "right"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "motion_blocks",
    tooltip: "Putar robot 90 derajat ke kiri atau kanan.",
  },
  {
    type: "kidobot_face",
    message0: "hadap ke %1",
    args0: [
      {
        type: "field_dropdown",
        name: "HEADING",
        options: [
          ["Utara (depan)", "north"],
          ["Timur (kanan)", "east"],
          ["Selatan (belakang)", "south"],
          ["Barat (kiri)", "west"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "motion_blocks",
    tooltip: "Arahkan robot langsung ke salah satu mata angin.",
  },
  {
    type: "kidobot_say",
    message0: "katakan %1",
    args0: [
      {
        type: "field_input",
        name: "TEXT",
        text: "Halo!",
      },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "looks_blocks",
    tooltip: "Tampilkan pesan di atas robot.",
  },
  {
    type: "kidobot_wait",
    message0: "tunggu %1 detik",
    args0: [
      {
        type: "field_number",
        name: "SECONDS",
        value: 1,
        min: 0,
        max: 10,
        precision: 0.5,
      },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "control_blocks",
    tooltip: "Beri jeda sebelum melanjutkan blok berikutnya.",
  },
  {
    type: "kidobot_led",
    message0: "nyalakan lampu %1",
    args0: [
      {
        type: "field_dropdown",
        name: "COLOUR",
        options: [
          ["cyan", "#22d3c5"],
          ["oranye", "#ff8a3d"],
          ["ungu", "#a78bfa"],
          ["merah", "#ff647c"],
          ["kuning", "#ffcf5c"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "looks_blocks",
    tooltip: "Ubah warna lampu LED robot.",
  },
  {
    type: "kidobot_repeat",
    message0: "ulangi %1 kali",
    args0: [
      {
        type: "field_number",
        name: "TIMES",
        value: 2,
        min: 1,
        max: 50,
        precision: 1,
      },
    ],
    message1: "lakukan %1",
    args1: [{ type: "input_statement", name: "DO" }],
    previousStatement: null,
    nextStatement: null,
    style: "control_blocks",
    tooltip: "Ulangi rangkaian blok beberapa kali.",
  },
  {
    type: "kidobot_if_distance",
    message0: "jika jarak ke %1 %2 %3 maka",
    args0: [
      {
        type: "field_dropdown",
        name: "DIRECTION",
        options: [
          ["depan", "front"],
          ["kiri", "left"],
          ["kanan", "right"],
          ["belakang", "back"],
        ],
      },
      {
        type: "field_dropdown",
        name: "OPERATOR",
        options: [
          ["<", "<"],
          [">", ">"],
          ["=", "=="],
        ],
      },
      {
        type: "field_number",
        name: "VALUE",
        value: 1,
        min: 0,
        max: 20,
        precision: 1,
      },
    ],
    message1: "lakukan %1",
    args1: [{ type: "input_statement", name: "DO" }],
    previousStatement: null,
    nextStatement: null,
    style: "sensor_blocks",
    tooltip: "Jalankan blok di dalamnya jika jarak ke dinding memenuhi syarat.",
  },
];

export function defineKidobotBlocks() {
  Blockly.defineBlocksWithJsonArray(BLOCK_DEFINITIONS);
}

export function registerKidobotGenerators() {
  javascriptGenerator.forBlock.kidobot_start = (block, generator) => {
    return generator.statementToCode(block, "DO");
  };

  javascriptGenerator.forBlock.kidobot_move = (block) => {
    const steps = Math.max(1, Math.round(Number(block.getFieldValue("STEPS")) || 1));
    return `await api.moveForward(${steps});\n`;
  };

  javascriptGenerator.forBlock.kidobot_turn = (block) => {
    const direction = block.getFieldValue("DIRECTION");
    return `await api.turn(${JSON.stringify(direction)});\n`;
  };

  javascriptGenerator.forBlock.kidobot_face = (block) => {
    const heading = block.getFieldValue("HEADING");
    return `await api.face(${JSON.stringify(heading)});\n`;
  };

  javascriptGenerator.forBlock.kidobot_say = (block) => {
    const text = block.getFieldValue("TEXT") ?? "";
    return `api.say(${JSON.stringify(text)});\n`;
  };

  javascriptGenerator.forBlock.kidobot_wait = (block) => {
    const seconds = Math.max(0, Number(block.getFieldValue("SECONDS")) || 0);
    return `await api.wait(${seconds});\n`;
  };

  javascriptGenerator.forBlock.kidobot_led = (block) => {
    const colour = block.getFieldValue("COLOUR");
    return `api.setLed(${JSON.stringify(colour)});\n`;
  };

  javascriptGenerator.forBlock.kidobot_repeat = (block, generator) => {
    const times = Math.max(1, Math.round(Number(block.getFieldValue("TIMES")) || 1));
    const body = generator.statementToCode(block, "DO");
    return `for (let i = 0; i < ${times}; i++) {\n${body}}\n`;
  };

  javascriptGenerator.forBlock.kidobot_if_distance = (block, generator) => {
    const direction = block.getFieldValue("DIRECTION");
    const operator = block.getFieldValue("OPERATOR");
    const value = Number(block.getFieldValue("VALUE")) || 0;
    const body = generator.statementToCode(block, "DO");
    return `if (api.distanceToWall(${JSON.stringify(direction)}) ${operator} ${value}) {\n${body}}\n`;
  };
}

export function createKidobotTheme() {
  return Blockly.Theme.defineTheme("kidobot", {
    name: "kidobot",
    base: Blockly.Themes.Classic,
    blockStyles: BLOCK_STYLES,
    componentStyles: {
      workspaceBackgroundColour: "#0a1730",
      toolboxBackgroundColour: "#0a1730",
      toolboxForegroundColour: "#eaf1ff",
      flyoutBackgroundColour: "#0f2140",
      flyoutForegroundColour: "#eaf1ff",
      flyoutOpacity: 1,
      scrollbarColour: "#38547f",
      scrollbarOpacity: 0.55,
      insertionMarkerColour: "#ffffff",
      insertionMarkerOpacity: 0.32,
      markerColour: "#22d3c5",
      cursorColour: "#22d3c5",
      selectedGlowColour: "#22d3c5",
      selectedGlowOpacity: 0.35,
    },
    fontStyle: {
      family: "Nunito, Segoe UI, sans-serif",
      weight: "700",
      size: 12,
    },
    startHats: false,
  });
}

function addBlock(workspace, type, fields = {}) {
  const block = workspace.newBlock(type);
  for (const [name, value] of Object.entries(fields)) {
    block.setFieldValue(value, name);
  }
  block.initSvg();
  block.render();
  return block;
}

export function createStarterProgram(workspace) {
  const start = addBlock(workspace, "kidobot_start");
  const sequence = [
    ["kidobot_move", { STEPS: 1 }],
    ["kidobot_turn", { DIRECTION: "right" }],
    ["kidobot_move", { STEPS: 1 }],
    ["kidobot_say", { TEXT: "Halo! Aku siap beraksi." }],
    ["kidobot_led", { COLOUR: "#22d3c5" }],
    ["kidobot_wait", { SECONDS: 1 }],
  ];

  let connection = start.getInput("DO").connection;
  for (const [type, fields] of sequence) {
    const block = addBlock(workspace, type, fields);
    connection.connect(block.previousConnection);
    connection = block.nextConnection;
  }

  start.moveBy(110, 70);
  workspace.scrollCenter();
  workspace.setScale(0.92);
  return start;
}

export { Blockly, javascriptGenerator, Order };
