const FIELD_WIDTH = 2400;
const FIELD_HEIGHT = 1300;
const PLAYER_RADIUS = 24;
const TEAM_HOME = "HOME";
const TEAM_AWAY = "AWAY";

class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  copy() {
    return new Vector2(this.x, this.y);
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  multiplyScalar(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  length() {
    return Math.hypot(this.x, this.y);
  }

  normalize() {
    const len = this.length() || 1;
    this.x /= len;
    this.y /= len;
    return this;
  }

  static subtract(a, b) {
    return new Vector2(a.x - b.x, a.y - b.y);
  }

  static distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}

class VirtualJoystick {
  constructor(zone, base, knob) {
    this.zone = zone;
    this.base = base;
    this.knob = knob;
    this.active = false;
    this.pointerId = null;
    this.input = new Vector2(0, 0);
    this.maxRadius = 0;
    this.bind();
    requestAnimationFrame(() => this.measure());
    window.addEventListener("resize", () => this.measure());
  }

  measure() {
    this.maxRadius = this.base.getBoundingClientRect().width * 0.33;
  }

  bind() {
    this.zone.addEventListener("pointerdown", (e) => this.onDown(e));
    this.zone.addEventListener("pointermove", (e) => this.onMove(e));
    this.zone.addEventListener("pointerup", (e) => this.onUp(e));
    this.zone.addEventListener("pointercancel", (e) => this.onUp(e));
    this.zone.addEventListener("pointerleave", (e) => this.onUp(e));
  }

  onDown(e) {
    this.active = true;
    this.pointerId = e.pointerId;
    this.zone.setPointerCapture(e.pointerId);
    this.updateInputFromEvent(e);
  }

  onMove(e) {
    if (!this.active || this.pointerId !== e.pointerId) {
      return;
    }
    this.updateInputFromEvent(e);
  }

  onUp(e) {
    if (!this.active || this.pointerId !== e.pointerId) {
      return;
    }
    this.active = false;
    this.pointerId = null;
    this.input.x = 0;
    this.input.y = 0;
    this.knob.style.transform = "translate(0px, 0px)";
  }

  updateInputFromEvent(e) {
    const rect = this.base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const mag = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(mag, this.maxRadius);
    const nx = (dx / mag) * clamped;
    const ny = (dy / mag) * clamped;

    this.input.x = nx / this.maxRadius;
    this.input.y = ny / this.maxRadius;
    this.knob.style.transform = `translate(${nx}px, ${ny}px)`;
  }
}

class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.position = new Vector2(FIELD_WIDTH * 0.5, FIELD_HEIGHT * 0.5);
    this.smooth = 5;
  }

  follow(target, dt) {
    const toTarget = Vector2.subtract(target, this.position);
    this.position.add(toTarget.multiplyScalar(Math.min(1, this.smooth * dt)));
    this.position.x = clamp(this.position.x, this.viewWidth * 0.5, FIELD_WIDTH - this.viewWidth * 0.5);
    this.position.y = clamp(this.position.y, this.viewHeight * 0.5, FIELD_HEIGHT - this.viewHeight * 0.5);
  }

  setViewSize(w, h) {
    this.viewWidth = w;
    this.viewHeight = h;
  }

  worldToScreen(v) {
    return new Vector2(
      v.x - (this.position.x - this.viewWidth * 0.5),
      v.y - (this.position.y - this.viewHeight * 0.5),
    );
  }
}

class Player {
  constructor(id, team, x, y, userControlled = false) {
    this.id = id;
    this.team = team;
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(0, 0);
    this.facing = new Vector2(1, 0);
    this.userControlled = userControlled;
    this.hasBall = false;
    this.speed = 180;
    this.sprintMultiplier = 1.6;
    this.downedTimer = 0;
  }

  isDowned() {
    return this.downedTimer > 0;
  }

  update(dt) {
    if (this.downedTimer > 0) {
      this.downedTimer -= dt;
      return;
    }

    this.position.add(this.velocity.copy().multiplyScalar(dt));
    this.position.x = clamp(this.position.x, PLAYER_RADIUS, FIELD_WIDTH - PLAYER_RADIUS);
    this.position.y = clamp(this.position.y, PLAYER_RADIUS, FIELD_HEIGHT - PLAYER_RADIUS);

    if (this.velocity.length() > 5) {
      this.facing = this.velocity.copy().normalize();
    }
  }
}

class Football {
  constructor() {
    this.owner = null;
    this.projectile = null;
    this.position = new Vector2();
  }

  attach(owner) {
    this.owner = owner;
    owner.hasBall = true;
    this.projectile = null;
  }

  launch(start, velocity, passerTeam) {
    this.owner = null;
    this.projectile = {
      position: start.copy(),
      velocity,
      passerTeam,
      life: 1.6,
    };
  }

  update(dt, players, gameManager) {
    if (this.owner) {
      this.position = this.owner.position.copy().add(this.owner.facing.copy().multiplyScalar(20));
      return;
    }

    if (!this.projectile) {
      return;
    }

    this.projectile.life -= dt;
    this.projectile.position.add(this.projectile.velocity.copy().multiplyScalar(dt));
    this.projectile.velocity.multiplyScalar(0.985);
    this.position = this.projectile.position;

    let bestReceiver = null;
    let closest = Infinity;
    for (const p of players) {
      if (p.isDowned()) {
        continue;
      }
      const dist = Vector2.distance(p.position, this.position);
      if (dist < PLAYER_RADIUS + 16 && dist < closest) {
        closest = dist;
        bestReceiver = p;
      }
    }

    if (bestReceiver) {
      gameManager.changePossession(bestReceiver);
      return;
    }

    if (
      this.projectile.life <= 0 ||
      this.position.x <= 0 ||
      this.position.y <= 0 ||
      this.position.x >= FIELD_WIDTH ||
      this.position.y >= FIELD_HEIGHT
    ) {
      gameManager.turnoverAt(this.position.copy());
    }
  }
}

class GameManager {
  constructor(players, football, hud) {
    this.players = players;
    this.football = football;
    this.hud = hud;
    this.homeScore = 0;
    this.awayScore = 0;
    this.quarter = 1;
    this.clock = 120;
    this.down = 1;
    this.yardsToGo = 10;
    this.lineOfScrimmage = FIELD_WIDTH * 0.5;
    this.possessionTeam = TEAM_HOME;
  }

  update(dt) {
    this.clock -= dt;
    if (this.clock <= 0) {
      this.clock = 120;
      this.quarter += 1;
    }

    const owner = this.football.owner;
    if (owner) {
      if (owner.team === TEAM_HOME && owner.position.x > FIELD_WIDTH - 80) {
        this.homeScore += 7;
        this.resetDrive(TEAM_AWAY);
      }
      if (owner.team === TEAM_AWAY && owner.position.x < 80) {
        this.awayScore += 7;
        this.resetDrive(TEAM_HOME);
      }
    }

    this.renderHud();
  }

  resetDrive(teamReceiving) {
    this.down = 1;
    this.yardsToGo = 10;
    this.possessionTeam = teamReceiving;
    this.players.forEach((p, i) => {
      p.hasBall = false;
      p.downedTimer = 0;
      if (p.team === TEAM_HOME) {
        p.position = new Vector2(550 + i * 80, 300 + (i % 2) * 250);
      } else {
        p.position = new Vector2(1750 - i * 80, 300 + (i % 2) * 250);
      }
      p.velocity = new Vector2();
    });

    const owner = this.players.find((p) => p.team === teamReceiving && p.userControlled) || this.players.find((p) => p.team === teamReceiving);
    this.changePossession(owner);
  }

  changePossession(player) {
    this.players.forEach((p) => (p.hasBall = false));
    this.possessionTeam = player.team;
    this.football.attach(player);
  }

  tackle(attacker) {
    const carrier = this.football.owner;
    if (!carrier || carrier.team === attacker.team || attacker.isDowned()) {
      return;
    }
    const dist = Vector2.distance(attacker.position, carrier.position);
    if (dist < PLAYER_RADIUS * 2.2) {
      carrier.downedTimer = 1.1;
      carrier.velocity = new Vector2();
      this.down = Math.min(4, this.down + 1);
      this.yardsToGo = Math.max(1, this.yardsToGo - 3);

      if (Math.random() < 0.25) {
        attacker.downedTimer = 0.35;
        this.changePossession(attacker);
      }

      if (this.down === 4) {
        this.turnoverAt(carrier.position.copy());
      }
    }
  }

  turnoverAt(position) {
    const next = this.players
      .filter((p) => p.team !== this.possessionTeam)
      .sort((a, b) => Vector2.distance(a.position, position) - Vector2.distance(b.position, position))[0];

    this.down = 1;
    this.yardsToGo = 10;
    if (next) {
      this.changePossession(next);
    }
  }

  renderHud() {
    this.hud.homeScore.textContent = `${this.homeScore}`;
    this.hud.awayScore.textContent = `${this.awayScore}`;
    const min = Math.floor(this.clock / 60)
      .toString()
      .padStart(2, "0");
    const sec = Math.floor(this.clock % 60)
      .toString()
      .padStart(2, "0");
    this.hud.gameClock.textContent = `${min}:${sec}`;
    this.hud.clockPanel.firstChild.textContent = `Q${this.quarter} `;
    this.hud.possessionTeam.textContent = this.possessionTeam;
    this.hud.downInfo.textContent = `${this.down} & ${this.yardsToGo}`;
  }
}

class PlayerController {
  constructor(player, joystick, buttons, gameManager, football) {
    this.player = player;
    this.joystick = joystick;
    this.buttons = buttons;
    this.gameManager = gameManager;
    this.football = football;
    this.sprinting = false;

    this.bindButtons();
  }

  bindButtons() {
    this.buttons.sprint.addEventListener("pointerdown", () => {
      this.sprinting = true;
      this.buttons.sprint.classList.add("pressed");
    });

    const releaseSprint = () => {
      this.sprinting = false;
      this.buttons.sprint.classList.remove("pressed");
    };
    this.buttons.sprint.addEventListener("pointerup", releaseSprint);
    this.buttons.sprint.addEventListener("pointercancel", releaseSprint);
    this.buttons.sprint.addEventListener("pointerleave", releaseSprint);

    this.buttons.pass.addEventListener("click", () => this.pass());
    this.buttons.tackle.addEventListener("click", () => this.gameManager.tackle(this.player));
  }

  pass() {
    if (!this.player.hasBall || this.player.isDowned()) {
      return;
    }

    const target = this.getBestReceiver();
    const direction = target
      ? Vector2.subtract(target.position, this.player.position).normalize()
      : this.player.facing.copy().normalize();

    this.player.hasBall = false;
    this.football.launch(this.player.position.copy(), direction.multiplyScalar(520), this.player.team);
  }

  getBestReceiver() {
    const allies = this.gameManager.players.filter((p) => p.team === this.player.team && p !== this.player && !p.isDowned());
    if (!allies.length) {
      return null;
    }

    allies.sort((a, b) => Vector2.distance(this.player.position, a.position) - Vector2.distance(this.player.position, b.position));
    return allies[0];
  }

  update() {
    const move = this.joystick.input.copy();
    if (move.length() < 0.08 || this.player.isDowned()) {
      this.player.velocity = this.player.velocity.multiplyScalar(0.85);
      return;
    }

    const maxSpeed = this.player.speed * (this.sprinting ? this.player.sprintMultiplier : 1);
    this.player.velocity = move.normalize().multiplyScalar(maxSpeed);
  }
}

class AIController {
  constructor(player, football) {
    this.player = player;
    this.football = football;
  }

  update() {
    if (this.player.userControlled || this.player.isDowned()) {
      return;
    }

    const target = this.football.owner
      ? this.football.owner.position
      : this.football.projectile
        ? this.football.projectile.position
        : new Vector2(FIELD_WIDTH * 0.5, FIELD_HEIGHT * 0.5);

    const toTarget = Vector2.subtract(target, this.player.position);
    const distance = toTarget.length();
    if (distance > 30) {
      this.player.velocity = toTarget.normalize().multiplyScalar(this.player.speed * 0.75);
    } else {
      this.player.velocity = this.player.velocity.multiplyScalar(0.8);
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createPlayers() {
  return [
    new Player("H1", TEAM_HOME, 580, 620, true),
    new Player("H2", TEAM_HOME, 700, 360),
    new Player("H3", TEAM_HOME, 760, 860),
    new Player("A1", TEAM_AWAY, 1700, 620),
    new Player("A2", TEAM_AWAY, 1580, 360),
    new Player("A3", TEAM_AWAY, 1520, 860),
  ];
}

function drawField(ctx, camera, viewW, viewH) {
  ctx.fillStyle = "#2d9642";
  ctx.fillRect(0, 0, viewW, viewH);

  const topLeft = new Vector2(camera.position.x - viewW * 0.5, camera.position.y - viewH * 0.5);
  const startX = Math.floor(topLeft.x / 120) * 120;

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  for (let x = startX; x < topLeft.x + viewW + 120; x += 120) {
    const sx = x - topLeft.x;
    ctx.beginPath();
    ctx.moveTo(sx, -10);
    ctx.lineTo(sx, viewH + 10);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  const endzoneWidth = 100;
  const leftZone = camera.worldToScreen(new Vector2(0, 0));
  const rightZone = camera.worldToScreen(new Vector2(FIELD_WIDTH - endzoneWidth, 0));
  ctx.fillRect(leftZone.x, leftZone.y, endzoneWidth, FIELD_HEIGHT);
  ctx.fillRect(rightZone.x, rightZone.y, endzoneWidth, FIELD_HEIGHT);
}

function drawPlayers(ctx, camera, players) {
  for (const p of players) {
    const s = camera.worldToScreen(p.position);
    ctx.beginPath();
    ctx.arc(s.x, s.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = p.team === TEAM_HOME ? "#1976d2" : "#c62828";
    if (p.isDowned()) {
      ctx.fillStyle = "#7a7a7a";
    }
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(p.id, s.x, s.y + 4);

    if (p.hasBall) {
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, PLAYER_RADIUS + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawBall(ctx, camera, football) {
  const s = camera.worldToScreen(football.position);
  ctx.fillStyle = "#5d3421";
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, 9, 6, 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function init() {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const hud = {
    homeScore: document.getElementById("homeScore"),
    awayScore: document.getElementById("awayScore"),
    gameClock: document.getElementById("gameClock"),
    possessionTeam: document.getElementById("possessionTeam"),
    downInfo: document.getElementById("downInfo"),
    clockPanel: document.getElementById("clockPanel"),
  };

  const joystick = new VirtualJoystick(
    document.getElementById("joystickZone"),
    document.getElementById("joystickBase"),
    document.getElementById("joystickKnob"),
  );

  const players = createPlayers();
  const football = new Football();
  const gameManager = new GameManager(players, football, hud);

  const userPlayer = players.find((p) => p.userControlled);
  const playerController = new PlayerController(
    userPlayer,
    joystick,
    {
      pass: document.getElementById("passBtn"),
      tackle: document.getElementById("tackleBtn"),
      sprint: document.getElementById("sprintBtn"),
    },
    gameManager,
    football,
  );

  const aiControllers = players.map((p) => new AIController(p, football));
  const camera = new Camera(canvas);

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    camera.setViewSize(canvas.width, canvas.height);
  }
  window.addEventListener("resize", resize);
  resize();

  gameManager.changePossession(userPlayer);
  gameManager.renderHud();

  let previous = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - previous) / 1000);
    previous = now;

    playerController.update();
    for (const ai of aiControllers) {
      ai.update();
    }

    for (const p of players) {
      p.update(dt);
    }

    football.update(dt, players, gameManager);

    const defenders = players.filter((p) => p.team !== userPlayer.team);
    for (const defender of defenders) {
      gameManager.tackle(defender);
    }

    gameManager.update(dt);
    camera.follow(userPlayer.position, dt);

    drawField(ctx, camera, canvas.width, canvas.height);
    drawPlayers(ctx, camera, players);
    drawBall(ctx, camera, football);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

init();
