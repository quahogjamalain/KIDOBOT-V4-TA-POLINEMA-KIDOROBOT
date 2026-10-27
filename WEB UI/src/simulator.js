export const DIRECTIONS = {
  north: {
    label: "Utara",
    relative: "Depan",
    short: "U",
    dx: 0,
    dy: -1,
    yaw: 0,
    angle: 0,
  },
  east: {
    label: "Timur",
    relative: "Samping kanan",
    short: "T",
    dx: 1,
    dy: 0,
    yaw: -Math.PI / 2,
    angle: 90,
  },
  south: {
    label: "Selatan",
    relative: "Belakang",
    short: "S",
    dx: 0,
    dy: 1,
    yaw: Math.PI,
    angle: 180,
  },
  west: {
    label: "Barat",
    relative: "Samping kiri",
    short: "B",
    dx: -1,
    dy: 0,
    yaw: Math.PI / 2,
    angle: 270,
  },
};

const DIRECTION_ORDER = ["north", "east", "south", "west"];

export class RobotStopped extends Error {
  constructor() {
    super("Program dihentikan.");
    this.name = "RobotStopped";
  }
}

export function turnHeading(heading, direction) {
  const index = DIRECTION_ORDER.indexOf(heading);
  const delta = direction === "left" ? -1 : 1;
  return DIRECTION_ORDER[(index + delta + DIRECTION_ORDER.length) % DIRECTION_ORDER.length];
}

export function getRelativeHeading(heading, relative) {
  if (relative === "left") return turnHeading(heading, "left");
  if (relative === "right") return turnHeading(heading, "right");
  if (relative === "back") return turnHeading(turnHeading(heading, "right"), "right");
  return heading;
}

export class RobotController {
  constructor({ scene, cols = 8, rows = 8, home = { x: 3, y: 4 }, onChange, onSay, onEvent }) {
    this.scene = scene;
    this.cols = cols;
    this.rows = rows;
    this.home = { ...home };
    this.onChange = onChange || (() => {});
    this.onSay = onSay || (() => {});
    this.onEvent = onEvent || (() => {});
    this.state = {
      position: { ...this.home },
      heading: "north",
      led: "#22d3c5",
    };
    this._runId = 0;
    this._actionCount = 0;
    this._waitTimer = 0;
  }

  syncScene() {
    this.scene.setPose(this.state.position, this.state.heading, { instant: true });
    this.scene.setLed(this.state.led);
    this.onChange(this.state);
    return this;
  }

  beginRun() {
    this._runId += 1;
    this._actionCount = 0;
    this.scene.setRunning(true);
    return this._runId;
  }

  finishRun() {
    this.scene.setRunning(false);
    this.scene.setLed(this.state.led);
  }

  stop() {
    this._runId += 1;
    clearTimeout(this._waitTimer);
    this.scene.setRunning(false);
    this.scene.setLed(this.state.led);
  }

  async reset() {
    this.stop();
    this.state.position = { ...this.home };
    this.state.heading = "north";
    this.state.led = "#22d3c5";
    this.scene.setPose(this.state.position, this.state.heading, { instant: true });
    this.scene.setLed(this.state.led);
    this.onSay("");
    this.onChange(this.state);
    this.onEvent("Posisi robot direset ke titik awal.", "idle");
  }

  createApi(runId) {
    return {
      moveForward: (steps) => this.moveForward(steps, runId),
      turn: (direction) => this.turn(direction, runId),
      face: (heading) => this.face(heading, runId),
      wait: (seconds) => this.wait(seconds, runId),
      say: (text) => this.say(text),
      setLed: (colour) => this.setLed(colour),
      distanceToWall: (relative) => this.getDistance(relative),
    };
  }

  getDistance(relative = "front") {
    const heading = getRelativeHeading(this.state.heading, relative);
    const { dx, dy } = DIRECTIONS[heading];
    if (dx > 0) return this.cols - 1 - this.state.position.x;
    if (dx < 0) return this.state.position.x;
    if (dy < 0) return this.state.position.y;
    return this.rows - 1 - this.state.position.y;
  }

  async moveForward(steps, runId) {
    this._assert(runId);
    const count = Math.max(1, Math.min(20, Math.round(Number(steps) || 1)));

    for (let index = 0; index < count; index += 1) {
      this._assert(runId);
      this._consumeAction();

      const direction = DIRECTIONS[this.state.heading];
      const next = {
        x: this.state.position.x + direction.dx,
        y: this.state.position.y + direction.dy,
      };

      if (next.x < 0 || next.x >= this.cols || next.y < 0 || next.y >= this.rows) {
        this.scene.bump();
        throw new Error("Robot menabrak batas arena. Coba belok terlebih dahulu.");
      }

      this.state.position = next;
      await this.scene.moveTo(next, this.state.heading);
      this._assert(runId);
      this.onChange(this.state);
      this.onEvent(
        `Maju ke petak X${next.x + 1} \u00b7 Y${next.y + 1} \u2014 menghadap ${DIRECTIONS[this.state.heading].label}.`,
        "running",
      );
    }
  }

  async turn(direction, runId) {
    this._assert(runId);
    this._consumeAction();
    const next = turnHeading(this.state.heading, direction);
    this.state.heading = next;
    await this.scene.turnTo(next);
    this._assert(runId);
    this.onChange(this.state);
    this.onEvent(
      `Belok ${direction === "left" ? "kiri" : "kanan"} \u2014 sekarang menghadap ${DIRECTIONS[next].label}.`,
      "running",
    );
  }

  async face(heading, runId) {
    this._assert(runId);
    this._consumeAction();
    if (!DIRECTIONS[heading]) throw new Error("Arah robot tidak dikenali.");
    this.state.heading = heading;
    await this.scene.turnTo(heading);
    this._assert(runId);
    this.onChange(this.state);
    this.onEvent(`Robot menghadap ${DIRECTIONS[heading].label}.`, "running");
  }

  async wait(seconds, runId) {
    this._assert(runId);
    const duration = Math.max(0, Math.min(10, Number(seconds) || 0));
    await new Promise((resolve, reject) => {
      const finishAt = performance.now() + duration * 1000;
      const tick = () => {
        if (runId !== this._runId) {
          reject(new RobotStopped());
          return;
        }
        if (performance.now() >= finishAt) {
          resolve();
          return;
        }
        this._waitTimer = setTimeout(tick, 50);
      };
      tick();
    });
  }

  say(text) {
    this.onSay(String(text ?? ""));
  }

  setLed(colour) {
    this.state.led = colour;
    this.scene.setLed(colour);
    this.onChange(this.state);
  }

  _assert(runId) {
    if (runId !== this._runId) throw new RobotStopped();
  }

  _consumeAction() {
    this._actionCount += 1;
    if (this._actionCount > 500) {
      throw new Error("Batas 500 aksi tercapai. Periksa kembali blok pengulanganmu.");
    }
  }
}
