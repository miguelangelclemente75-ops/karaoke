const express = require("express");
const cors = require("cors");
const path = require("path");
const { exec } = require("child_process");
const net = require("net");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const ADB = "C:\\tv-control\\platform-tools-latest-windows\\platform-tools\\adb.exe";

// ── API TOKEN ──────────────────────────────────────────────
const API_TOKEN = "hurricane-tv-2024-secret";

function requireToken(req, res, next) {
  const token = req.headers["x-api-token"];
  if (token !== API_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
// ──────────────────────────────────────────────────────────

function adbCmd(ip, command) {
  return new Promise((resolve) => {
    exec(`"${ADB}" -s ${ip}:5555 ${command}`, { timeout: 5000 }, (err, stdout) => {
      resolve({ ok: !err, output: stdout });
    });
  });
}

async function adbConnect(ip) {
  return new Promise((resolve) => {
    exec(`"${ADB}" connect ${ip}:5555`, { timeout: 5000 }, (err, stdout) => {
      resolve(!err && stdout.includes("connected"));
    });
  });
}

const TVS = [
  { id: 1,  name: "Karaoke Stage",       ip: "192.168.3.64",  type: "firetv", karaoke: true },
  { id: 2,  name: "Karaoke Main TV",     ip: "192.168.3.116", type: "firetv", karaokeMain: true },
  { id: 3,  name: "Karaoke Queue TV",    ip: "192.168.3.20",  type: "roku",   karaokeQueue: true },
  { id: 4,  name: "Sport Bar TV 2",      ip: "192.168.3.31",  type: "roku" },
  { id: 5,  name: "Main Entrance TV 1",  ip: "192.168.3.37",  type: "roku" },
  { id: 6,  name: "Main Entrance TV 2",  ip: "192.168.3.59",  type: "roku" },
  { id: 7,  name: "Outside Sport Bar",   ip: "192.168.3.61",  type: "roku" },
  { id: 8,  name: "Billiard Lounge TV",  ip: "192.168.3.101", type: "roku" },
  { id: 9,  name: "Music Station",       ip: "192.168.3.241", type: "roku" },
  { id: 10, name: "Outside Sport Bar 2", ip: "192.168.3.249", type: "samsung" },
];

const ROKU_YOUTUBE_CHANNEL = "195316";
const SAMSUNG_PORT = 8001;

async function rokuCommand(ip, command) {
  try {
    const res = await fetch(`http://${ip}:8060/${command}`, { method: "POST", signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch { return false; }
}

async function rokuQuery(ip, endpoint) {
  try {
    const res = await fetch(`http://${ip}:8060/${endpoint}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

let wsModule = null;
function getWS() {
  if (!wsModule) { try { wsModule = require("ws"); } catch { return null; } }
  return wsModule;
}

function samsungCommand(ip, key) {
  return new Promise((resolve) => {
    const WS = getWS();
    if (!WS) return resolve(false);
    try {
      const ws = new WS(`ws://${ip}:${SAMSUNG_PORT}/api/v2/channels/samsung.remote.control?name=HurricaneControl`);
      const timeout = setTimeout(() => { try { ws.close(); } catch {} resolve(false); }, 4000);
      ws.on("open", () => {
        ws.send(JSON.stringify({ method: "ms.remote.control", params: { Cmd: "Click", DataOfCmd: key, Option: "false", TypeOfRemote: "SendRemoteKey" } }));
        setTimeout(() => { clearTimeout(timeout); try { ws.close(); } catch {} resolve(true); }, 600);
      });
      ws.on("error", () => { clearTimeout(timeout); resolve(false); });
    } catch { resolve(false); }
  });
}

async function samsungOnline(ip) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.connect(SAMSUNG_PORT, ip, () => { socket.destroy(); resolve(true); });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => { socket.destroy(); resolve(false); });
  });
}

const SAMSUNG_KEYS = {
  "PowerOn": "KEY_POWER", "PowerOff": "KEY_POWER",
  "VolumeUp": "KEY_VOLUP", "VolumeDown": "KEY_VOLDOWN",
  "VolumeMute": "KEY_MUTE", "Home": "KEY_HOME", "Back": "KEY_RETURN",
};

const FIRETV_KEYS = {
  "PowerOn": "shell input keyevent 26", "PowerOff": "shell input keyevent 26",
  "VolumeUp": "shell input keyevent 24", "VolumeDown": "shell input keyevent 25",
  "VolumeMute": "shell input keyevent 164", "Home": "shell input keyevent 3", "Back": "shell input keyevent 4",
};

async function fireTVCommand(ip, command) {
  const adbCommand = FIRETV_KEYS[command];
  if (!adbCommand) return false;
  await adbConnect(ip);
  const result = await adbCmd(ip, adbCommand);
  return result.ok;
}

async function fireTVLaunchUrl(ip, url) {
  await adbConnect(ip);
  const result = await adbCmd(ip, `shell am start -a android.intent.action.VIEW -d "${url}"`);
  return result.ok;
}

async function fireTVLaunchApp(ip, packageName) {
  await adbConnect(ip);
  const result = await adbCmd(ip, `shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`);
  return result.ok;
}

// ── Rutas públicas (sin token) ─────────────────────────────
app.get("/api/tvs", (req, res) => res.json(TVS));

// ── Rutas protegidas (requieren token) ────────────────────
app.get("/api/tv/:id/status", requireToken, async (req, res) => {
  const tv = TVS.find(t => t.id === parseInt(req.params.id));
  if (!tv) return res.status(404).json({ error: "TV not found" });

  if (tv.type === "roku") {
    const data = await rokuQuery(tv.ip, "query/device-info");
    if (!data) return res.json({ online: false });
    const m = data.match(/<power-mode>([^<]+)<\/power-mode>/);
    return res.json({ online: true, power: m ? m[1] : "Unknown" });
  }

  if (tv.type === "samsung") {
    const online = await samsungOnline(tv.ip);
    return res.json({ online, power: online ? "Online" : "Offline" });
  }

  res.json({ online: true, power: "Unknown" });
});

app.post("/api/tv/:id/command", requireToken, async (req, res) => {
  const tv = TVS.find(t => t.id === parseInt(req.params.id));
  if (!tv) return res.status(404).json({ error: "TV not found" });

  const { command } = req.body;
  let ok = false;

  if (tv.type === "roku") ok = await rokuCommand(tv.ip, `keypress/${command}`);
  else if (tv.type === "firetv") ok = await fireTVCommand(tv.ip, command);
  else if (tv.type === "samsung") { const key = SAMSUNG_KEYS[command]; if (key) ok = await samsungCommand(tv.ip, key); }

  res.json({ ok });
});

app.post("/api/tv/:id/launch-url", requireToken, async (req, res) => {
  const tv = TVS.find(t => t.id === parseInt(req.params.id));
  if (!tv) return res.status(404).json({ error: "TV not found" });

  const { url } = req.body;
  let ok = false;

  if (tv.type === "roku") {
    ok = await rokuCommand(tv.ip, `launch/34058?url=${encodeURIComponent(url)}`);
  } else if (tv.type === "firetv") {
    if (tv.karaokeMain) {
      ok = await fireTVLaunchApp(tv.ip, "com.hurricane.karaoke");
    } else if (tv.karaoke) {
      ok = await fireTVLaunchApp(tv.ip, "com.hurricane.queue");
    } else {
      ok = await fireTVLaunchUrl(tv.ip, url);
    }
  } else if (tv.type === "samsung") {
    ok = await samsungCommand(tv.ip, "KEY_HOME");
  }

  res.json({ ok });
});

app.post("/api/tv/:id/youtube", requireToken, async (req, res) => {
  const tv = TVS.find(t => t.id === parseInt(req.params.id));
  if (!tv) return res.status(404).json({ error: "TV not found" });

  let ok = false;

  if (tv.type === "roku") ok = await rokuCommand(tv.ip, `launch/${ROKU_YOUTUBE_CHANNEL}`);
  else if (tv.type === "firetv") {
    await adbConnect(tv.ip);
    const r = await adbCmd(tv.ip, `shell am start -n com.amazon.firetv.youtube/com.amazon.firetv.youtube.app.YouTubeActivity`);
    ok = r.ok;
    if (!ok) ok = await fireTVLaunchUrl(tv.ip, "https://www.youtube.com");
  } else if (tv.type === "samsung") ok = await samsungCommand(tv.ip, "KEY_HOME");

  res.json({ ok });
});

app.post("/api/all/command", requireToken, async (req, res) => {
  const { command } = req.body;
  const results = await Promise.all(TVS.map(async tv => {
    let ok = false;
    if (tv.type === "roku") ok = await rokuCommand(tv.ip, `keypress/${command}`);
    else if (tv.type === "firetv") ok = await fireTVCommand(tv.ip, command);
    else if (tv.type === "samsung") { const key = SAMSUNG_KEYS[command]; if (key) ok = await samsungCommand(tv.ip, key); }
    return { id: tv.id, name: tv.name, ok };
  }));
  res.json(results);
});

app.post("/api/all/launch-url", requireToken, async (req, res) => {
  const { url } = req.body;
  const results = await Promise.all(TVS.map(async tv => {
    let ok = false;
    if (tv.type === "roku") ok = await rokuCommand(tv.ip, `launch/34058?url=${encodeURIComponent(url)}`);
    else if (tv.type === "firetv") ok = await fireTVLaunchUrl(tv.ip, url);
    else if (tv.type === "samsung") ok = await samsungCommand(tv.ip, "KEY_HOME");
    return { id: tv.id, name: tv.name, ok };
  }));
  res.json(results);
});

app.post("/api/all/youtube", requireToken, async (req, res) => {
  const results = await Promise.all(TVS.map(async tv => {
    let ok = false;
    if (tv.type === "roku") ok = await rokuCommand(tv.ip, `launch/${ROKU_YOUTUBE_CHANNEL}`);
    else if (tv.type === "firetv") {
      await adbConnect(tv.ip);
      const r = await adbCmd(tv.ip, `shell am start -n com.amazon.firetv.youtube/com.amazon.firetv.youtube.app.YouTubeActivity`);
      ok = r.ok;
      if (!ok) ok = await fireTVLaunchUrl(tv.ip, "https://www.youtube.com");
    } else if (tv.type === "samsung") ok = await samsungCommand(tv.ip, "KEY_HOME");
    return { id: tv.id, name: tv.name, ok };
  }));
  res.json(results);
});

const PORT = 3500;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🌀 Hurricane TV Control Server`);
  console.log(`✅ Running at http://localhost:${PORT}`);
  console.log(`📱 From other devices: http://192.168.3.13:${PORT}`);
  console.log(`🔒 API Token protection: ENABLED`);
  console.log(`\nTVs configured: ${TVS.length}`);
  console.log(`Press Ctrl+C to stop\n`);
  try { require("ws"); console.log("✅ Samsung WebSocket support ready"); }
  catch { exec("npm install ws", { cwd: __dirname }, () => console.log("✅ ws installed")); }
});
