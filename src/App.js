import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TVPlayer from "./TVPlayer";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCCp5XcNOw6Kbs_wv5Mg2LojV8BY2rTrbI",
  authDomain: "karaoke-app-1e2ce.firebaseapp.com",
  databaseURL: "https://karaoke-app-1e2ce-default-rtdb.firebaseio.com",
  projectId: "karaoke-app-1e2ce",
  storageBucket: "karaoke-app-1e2ce.firebasestorage.app",
  messagingSenderId: "404006629002",
  appId: "1:404006629002:web:dd4ec169ad20b473798773",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const YT_API_KEYS = [
  process.env.REACT_APP_YT_KEY_1,
  process.env.REACT_APP_YT_KEY_2,
  process.env.REACT_APP_YT_KEY_3,
  process.env.REACT_APP_YT_KEY_4,
  process.env.REACT_APP_YT_KEY_5,
  process.env.REACT_APP_YT_KEY_6,
].filter(Boolean);
let currentKeyIndex = 0;
function getYTKey() { return YT_API_KEYS[currentKeyIndex]; }
function rotateYTKey() {
  if (!YT_API_KEYS.length) return;
  currentKeyIndex = (currentKeyIndex + 1) % YT_API_KEYS.length;
}
const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || "karaoke2024";
const TABLES = [1, 2, 3, 4, 5, 6];

const css = `
  @keyframes floatNote{0%{transform:translateY(100vh) rotate(0deg);opacity:0}10%{opacity:.15}90%{opacity:.08}100%{transform:translateY(-80px) rotate(360deg);opacity:0}}
  @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
  @keyframes slideIn{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes toastIn{from{transform:translateX(110px);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
  .fn{position:fixed;color:#ff00ff;animation:floatNote 9s linear infinite;pointer-events:none;z-index:0}
  .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:20px;animation:slideIn .3s ease}
  .card-green{background:rgba(0,200,100,.07);border:1px solid rgba(0,200,100,.25);border-radius:18px;padding:20px}
  .card-yellow{background:rgba(255,200,0,.07);border:1px solid rgba(255,200,0,.25);border-radius:18px;padding:16px}
  .glow{background:linear-gradient(90deg,#ff00ff,#00ffff,#ff00ff);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 3s linear infinite}
  .btn{border:none;color:#fff;border-radius:50px;cursor:pointer;font-family:Georgia,serif;font-weight:bold;transition:all .2s;letter-spacing:.5px}
  .btn:disabled{opacity:.55;cursor:not-allowed;transform:none !important;box-shadow:none !important}
  .btn-p{background:linear-gradient(135deg,#ff00ff,#9900ff);padding:11px 26px;font-size:.95rem}
  .btn-p:hover{transform:scale(1.04);box-shadow:0 0 18px rgba(255,0,255,.45)}
  .btn-r{background:rgba(255,50,50,.2);border:1px solid rgba(255,50,50,.4);color:#ff8888;padding:8px 14px;border-radius:20px;cursor:pointer;font-family:Georgia,serif;transition:all .2s}
  .tab{background:transparent;border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.55);padding:8px 18px;border-radius:50px;cursor:pointer;font-family:Georgia,serif;transition:all .2s;font-size:.85rem}
  .tab.on{background:linear-gradient(135deg,#ff00ff,#9900ff);color:#fff;border-color:transparent}
  .inp{background:rgba(255,255,255,.05);border:1px solid rgba(255,0,255,.3);color:#fff;padding:10px 15px;border-radius:12px;font-family:Georgia,serif;font-size:.95rem;outline:none;width:100%;box-sizing:border-box}
  .inp:focus{border-color:#ff00ff;box-shadow:0 0 10px rgba(255,0,255,.2)}
  .inp::placeholder{color:rgba(255,255,255,.28)}
  .vcard{cursor:pointer;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:10px 12px;background:rgba(255,255,255,.03);transition:all .2s;display:flex;gap:10px;align-items:center}
  .vcard:hover{border-color:#ff00ff;background:rgba(255,0,255,.1);transform:translateY(-2px)}
  .vcard.sel{border-color:#00cc66;background:rgba(0,200,100,.12)}
  .spin{width:28px;height:28px;border:3px solid rgba(255,0,255,.15);border-top-color:#ff00ff;border-radius:50%;animation:spin .75s linear infinite;margin:0 auto}
  .badge{display:inline-block;font-size:.65rem;padding:2px 10px;border-radius:20px;font-weight:bold;letter-spacing:.5px}
  .badge-y{background:rgba(255,200,0,.2);border:1px solid rgba(255,200,0,.4);color:#ffcc00}
  .badge-g{background:rgba(0,200,100,.2);border:1px solid rgba(0,200,100,.4);color:#00cc66}
  .badge-r{background:rgba(255,50,50,.2);border:1px solid rgba(255,50,50,.4);color:#ff6666}
  .live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff4444;animation:blink 1s ease infinite;margin-right:6px}
`;

function safeTable(value) {
  const parsed = Number.parseInt(String(value), 10);
  return TABLES.includes(parsed) ? parsed : null;
}

function getRuntimeParams() {
  if (typeof window === "undefined") return { isTVMode: false, isDJMode: false, tableFromURL: null };
  const urlParams = new URLSearchParams(window.location.search);
  return {
    isTVMode: urlParams.get("modo") === "tv",
    isDJMode: urlParams.get("dj") === "1",
    tableFromURL: safeTable(urlParams.get("mesa")),
  };
}

async function searchYT(query) {
  if (!YT_API_KEYS.length) {
    throw new Error("No YouTube API keys configured");
  }
  let lastError = null;
  for (let attempt = 0; attempt < YT_API_KEYS.length; attempt++) {
    const key = getYTKey();
    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${key}`;
      const res = await fetch(searchUrl);
      if (!res.ok) { rotateYTKey(); continue; }
      const data = await res.json();
      if (data.error?.code === 403) { rotateYTKey(); continue; }
      if (!Array.isArray(data.items) || data.items.length === 0) return [];
      const ids = data.items.map((item) => item?.id?.videoId).filter(Boolean).join(",");
      if (!ids) return [];
      const detailUrl = `https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${ids}&key=${key}`;
      const detailRes = await fetch(detailUrl);
      if (!detailRes.ok) throw new Error("YouTube details failed");
      const detailData = await detailRes.json();
      return (detailData.items || [])
        .filter((item) => item?.status?.embeddable && item?.id)
        .slice(0, 6)
        .map((item) => ({
          id: item.id,
          title: item?.snippet?.title || "Untitled",
          author: item?.snippet?.channelTitle || "Unknown channel",
          thumb: item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || "",
        }));
    } catch (err) { lastError = err; rotateYTKey(); }
  }
  throw lastError || new Error("All YouTube API keys exhausted");
}

export default function App() {
  const runtime = useMemo(() => getRuntimeParams(), []);
  const { isTVMode, isDJMode, tableFromURL } = runtime;
  const isNextUpMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("modo") === "nextup";

  const [view, setView] = useState("home");
  const [name, setName] = useState("");
  const [table, setTable] = useState(tableFromURL);
  const [songQ, setSongQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [ytResults, setYtResults] = useState([]);
  const [ytFailed, setYtFailed] = useState(false);
  const [pickedVideo, setPickedVideo] = useState(null);
  const [adminOk, setAdminOk] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminErr, setAdminErr] = useState(false);
  const [djTab, setDjTab] = useState("pending");
  const [toast, setToast] = useState(null);
  const [myReqs, setMyReqs] = useState([]);
  const [pending, setPending] = useState([]);
  const [queue, setQueue] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const toastTimerRef = useRef(null);
  const notes = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ left:`${8+i*13}%`, delay:`${i*1.1}s`, size:`${1.1+(i%3)*0.4}rem`, op:0.12+(i%3)*0.07 })), []);

  const toast$ = useCallback((msg, type = "ok") => {
    setToast({ msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => { return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }; }, []);
  useEffect(() => { if (tableFromURL !== null) setTable(tableFromURL); }, [tableFromURL]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("karaoke_my_requests");
      if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) setMyReqs(parsed); }
    } catch {}
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem("karaoke_my_requests", JSON.stringify(myReqs)); } catch {}
  }, [myReqs]);

  useEffect(() => {
    const pendingRef = ref(db, "pending");
    const queueRef = ref(db, "queue");
    const currentRef = ref(db, "current");
    const unsubscribePending = onValue(pendingRef, (snap) => {
      const data = snap.val();
      if (!data) return setPending([]);
      setPending(Object.entries(data).map(([key, val]) => ({ ...(val||{}), fbKey:key })).sort((a,b) => (a.timestamp||0)-(b.timestamp||0)));
    });
    const unsubscribeQueue = onValue(queueRef, (snap) => {
      const data = snap.val();
      if (!data) return setQueue([]);
      setQueue(Object.entries(data).map(([key, val]) => ({ ...(val||{}), fbKey:key })).sort((a,b) => (a.timestamp||0)-(b.timestamp||0)));
    });
    const unsubscribeCurrent = onValue(currentRef, (snap) => { setCurrentSong(snap.val() || null); });
    return () => { unsubscribePending(); unsubscribeQueue(); unsubscribeCurrent(); };
  }, []);

  const doSearch = async () => {
    if (!songQ.trim() || searching) return;
    setSearching(true); setYtFailed(false); setPickedVideo(null); setYtResults([]);
    try {
      const results = await searchYT(`${songQ.trim()} karaoke lyrics`);
      if (results.length === 0) toast$("No results found, try a different name", "err");
      setYtResults(results);
    } catch { setYtFailed(true); toast$("Could not connect to YouTube", "err"); }
    finally { setSearching(false); }
  };

  const submitReq = async () => {
    if (submitting) return;
    if (!name.trim()) return toast$("Please enter your name", "err");
    if (!table && tableFromURL === null) return toast$("Please select your table", "err");
    if (!pickedVideo) return toast$("Please choose a video first", "err");
    const normalizedName = name.trim();
    const finalTable = tableFromURL ?? table;
    const duplicatePending = pending.some((p) => p.videoId===pickedVideo.id && p.singer?.toLowerCase()===normalizedName.toLowerCase() && p.table===finalTable);
    const duplicateQueued = queue.some((q) => q.videoId===pickedVideo.id && q.singer?.toLowerCase()===normalizedName.toLowerCase() && q.table===finalTable);
    if (duplicatePending || duplicateQueued) return toast$("This song is already in progress for you", "err");
    setSubmitting(true);
    try {
      const req = { title:pickedVideo.title, author:pickedVideo.author, videoId:pickedVideo.id, thumb:pickedVideo.thumb, singer:normalizedName, table:finalTable, status:"pending", timestamp:Date.now() };
      const newRef = await push(ref(db, "pending"), req);
      setMyReqs((prev) => [...prev, { ...req, fbKey:newRef.key }]);
      setSongQ(""); setYtResults([]); setPickedVideo(null); setView("mystatus");
      toast$("🎤 Request sent — waiting for DJ approval!");
    } catch { toast$("Could not send the request", "err"); }
    finally { setSubmitting(false); }
  };

  const approve = async (req) => {
    if (!req?.fbKey || workingId) return;
    setWorkingId(req.fbKey);
    try {
      const queueRef = push(ref(db, "queue"));
      await update(ref(db), {
        [`queue/${queueRef.key}`]: { title:req.title, author:req.author, videoId:req.videoId, thumb:req.thumb, singer:req.singer, table:req.table, timestamp:Date.now(), sourcePendingKey:req.fbKey },
        [`pending/${req.fbKey}`]: null,
      });
      toast$("✅ Approved");
    } catch { toast$("Could not approve request", "err"); }
    finally { setWorkingId(""); }
  };

  const reject = async (req) => {
    if (!req?.fbKey || workingId) return;
    setWorkingId(req.fbKey);
    try { await remove(ref(db, `pending/${req.fbKey}`)); toast$("❌ Rejected", "err"); }
    catch { toast$("Could not reject request", "err"); }
    finally { setWorkingId(""); }
  };

  const removeQ = async (req) => {
    if (!req?.fbKey || workingId) return;
    setWorkingId(req.fbKey);
    try { await remove(ref(db, `queue/${req.fbKey}`)); toast$("Removed", "err"); }
    catch { toast$("Could not remove from queue", "err"); }
    finally { setWorkingId(""); }
  };

  const playSong = async (entry) => {
    if (!entry?.fbKey || workingId) return;
    setWorkingId(entry.fbKey);
    try {
      await update(ref(db), { current:{ title:entry.title, author:entry.author, videoId:entry.videoId, thumb:entry.thumb, singer:entry.singer, table:entry.table, queueKey:entry.fbKey, startedAt:Date.now() }, [`queue/${entry.fbKey}`]:null });
      setDjTab("now"); toast$("▶ Now playing on TV!");
    } catch { toast$("Could not start song", "err"); }
    finally { setWorkingId(""); }
  };

  const stopSong = async () => {
    if (workingId==="__stop__") return;
    setWorkingId("__stop__");
    try { await set(ref(db, "current"), null); toast$("⏹ Stopped", "err"); }
    catch { toast$("Could not stop song", "err"); }
    finally { setWorkingId(""); }
  };

  const restartSong = async () => {
    if (!currentSong || workingId==="__restart__") return;
    setWorkingId("__restart__");
    try { await update(ref(db), { current:{ ...currentSong, startedAt:Date.now() } }); toast$("🔄 Restarting song..."); }
    catch { toast$("Could not restart song", "err"); }
    finally { setWorkingId(""); }
  };

  const requeueSong = async (entry) => {
    try {
      await push(ref(db, "queue"), { title:entry.title, author:entry.author, videoId:entry.videoId, thumb:entry.thumb, singer:entry.singer, table:entry.table, timestamp:Date.now() });
      toast$("🔁 Added to queue!");
    } catch { toast$("Could not requeue song", "err"); }
  };

  const playNow = async (entry) => {
    if (workingId) return;
    setWorkingId("__playnow__");
    try {
      await update(ref(db), { current:{ title:entry.title, author:entry.author, videoId:entry.videoId, thumb:entry.thumb, singer:entry.singer, table:entry.table, startedAt:Date.now() } });
      setDjTab("now"); toast$("▶ Playing now on TV!");
    } catch { toast$("Could not play song", "err"); }
    finally { setWorkingId(""); }
  };

  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const longPressTimer = useRef(null);
  const isDragging = useRef(false);
  const queueListRef = useRef(null);
  const autoScrollTimer = useRef(null);

  useEffect(() => {
    const prevent = (e) => { if (isDragging.current) e.preventDefault(); };
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, []);

  const startAutoScroll = (direction) => {
    if (autoScrollTimer.current) return;
    autoScrollTimer.current = setInterval(() => { if (queueListRef.current) queueListRef.current.scrollTop += direction * 8; }, 16);
  };

  const stopAutoScroll = () => { clearInterval(autoScrollTimer.current); autoScrollTimer.current = null; };

  const reorderQueue = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const newQueue = [...queue];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved);
    const now = Date.now();
    const updates = {};
    newQueue.forEach((item, i) => { updates[`queue/${item.fbKey}/timestamp`] = now + i; });
    try { await update(ref(db), updates); toast$("↕ Queue reordered!"); }
    catch { toast$("Could not reorder queue", "err"); }
  };

  const loginAdmin = () => {
    if (adminPwd === ADMIN_PASSWORD) { setAdminOk(true); setAdminErr(false); setAdminPwd(""); toast$("DJ access granted"); return; }
    setAdminErr(true); setAdminPwd("");
  };

  const statusByRequest = (req) => {
    const requestId = req.fbKey;
    if (currentSong?.queueKey && currentSong.queueKey === requestId) return "playing";
    if (queue.some((q) => q.sourcePendingKey===requestId || q.fbKey===requestId)) return "approved";
    if (pending.some((p) => p.fbKey===requestId)) return "pending";
    return "done";
  };

  if (isNextUpMode) {
    return (
      <div style={{ width:"100vw", height:"100vh", background:"#080018", display:"flex", flexDirection:"column", fontFamily:"Georgia,serif", overflow:"hidden" }}>
        <style>{css}</style>
        <style>{`@keyframes marquee{0%{transform:translateX(100vw)}100%{transform:translateX(-100%)}} @keyframes fadeRow{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ background:"linear-gradient(90deg,#1a0035,#0d001a)", borderBottom:"2px solid #ff00ff", padding:"10px 30px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:"1.6rem", fontWeight:"bold", background:"linear-gradient(90deg,#ff00ff,#00ffff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:4 }}>HURRICANE</div>
            <div style={{ color:"rgba(255,255,255,0.5)", fontSize:".75rem", letterSpacing:3 }}>🎤 KARAOKE NIGHT</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:"rgba(255,255,255,0.35)", fontSize:".75rem", letterSpacing:2 }}>COMING UP NEXT</div>
            <div style={{ color:"#ffcc00", fontSize:"1.4rem", fontWeight:"bold" }}>{queue.length} in queue</div>
          </div>
        </div>
        {currentSong && (
          <div style={{ background:"rgba(0,200,100,0.12)", borderBottom:"1px solid rgba(0,200,100,0.4)", padding:"8px 30px", display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
            <span className="live-dot" style={{ width:10, height:10 }}/>
            <div style={{ color:"rgba(255,255,255,0.5)", fontSize:".8rem", letterSpacing:2, flexShrink:0 }}>NOW PLAYING</div>
            <div style={{ fontWeight:"bold", fontSize:"1rem", color:"#00ff88", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{currentSong.title}</div>
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:".8rem", flexShrink:0 }}>🎤 {currentSong.singer} · Table {currentSong.table}</div>
          </div>
        )}
        <div style={{ flex:1, overflowY:"hidden", padding:"8px 30px" }}>
          {queue.length === 0 ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:14 }}>
              <div style={{ fontSize:"3rem" }}>🎵</div>
              <div style={{ fontSize:"1.4rem", color:"rgba(255,255,255,0.3)", letterSpacing:3 }}>Queue is empty</div>
              <div style={{ fontSize:".9rem", color:"rgba(255,255,255,0.2)" }}>Scan the QR code at your table to request a song</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {queue.slice(0, 10).map((entry, i) => (
                <div key={entry.fbKey} style={{ display:"flex", alignItems:"center", gap:14, background: i===0?"rgba(255,204,0,0.1)":"rgba(255,255,255,0.03)", border: i===0?"1px solid rgba(255,204,0,0.35)":"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"7px 14px", animation:`fadeRow 0.3s ease ${i*0.05}s both` }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0, background: i===0?"linear-gradient(135deg,#ffcc00,#ff8800)":"rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"bold", fontSize: i===0?"1.1rem":".95rem", color: i===0?"#000":"rgba(255,255,255,0.5)" }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:"bold", fontSize: i===0?"1rem":".88rem", color: i===0?"#ffcc00":"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:1 }}>{entry.title}</div>
                    <div style={{ color:"rgba(255,255,255,0.5)", fontSize:".75rem" }}>🎤 {entry.singer}</div>
                  </div>
                  <div style={{ background: i===0?"rgba(255,204,0,0.2)":"rgba(255,0,255,0.1)", border: i===0?"1px solid rgba(255,204,0,0.4)":"1px solid rgba(255,0,255,0.25)", borderRadius:8, padding:"4px 12px", flexShrink:0, textAlign:"center" }}>
                    <div style={{ color:"rgba(255,255,255,0.4)", fontSize:".6rem", letterSpacing:2 }}>TABLE</div>
                    <div style={{ fontWeight:"bold", fontSize:"1.1rem", color: i===0?"#ffcc00":"#ff88ff" }}>{entry.table}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ background:"rgba(255,0,255,0.08)", borderTop:"1px solid rgba(255,0,255,0.2)", padding:"8px 0", overflow:"hidden", flexShrink:0 }}>
          <div style={{ display:"inline-block", animation:"marquee 25s linear infinite", whiteSpace:"nowrap", fontSize:".85rem", color:"rgba(255,255,255,0.4)", letterSpacing:2 }}>
            &nbsp;&nbsp;&nbsp;🎤 Scan the QR code at your table to request a song &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 🌀 HURRICANE KARAOKE NIGHT &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 🎵 Request your favorite song and get ready to sing! &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
          </div>
        </div>
      </div>
    );
  }

  if (isTVMode) {
    return (
      <div style={{ width:"100vw", height:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"Georgia,serif" }}>
        <style>{css}</style>
        {currentSong ? (
          <TVPlayer song={currentSong} nextSong={queue[0]||null} onSongEnded={async () => { try { await set(ref(db, "current"), null); } catch {} }} />
        ) : (
          <div style={{ textAlign:"center", color:"#fff" }}>
            <div style={{ fontSize:"6rem", marginBottom:20 }}>🎤</div>
            <h1 style={{ fontSize:"4rem", marginBottom:4, background:"linear-gradient(90deg,#ff00ff,#00ffff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:6 }}>HURRICANE</h1>
            <h2 style={{ fontSize:"1.6rem", color:"rgba(255,255,255,0.55)", marginBottom:30, letterSpacing:8, fontWeight:"normal" }}>🎤 KARAOKE NIGHT 🎤</h2>
            <p style={{ color:"rgba(255,255,255,0.4)", fontSize:"1.1rem", marginBottom:30 }}>Scan the QR code at your table to request a song</p>
            {queue.length > 0 && (
              <div style={{ marginTop:20 }}>
                <p style={{ color:"rgba(255,255,255,0.4)", fontSize:".9rem", marginBottom:12 }}>UP NEXT:</p>
                {queue.slice(0, 3).map((s, i) => (
                  <div key={s.fbKey} style={{ color: i===0?"#ffcc00":"rgba(255,255,255,0.5)", fontSize: i===0?"1.1rem":".9rem", marginBottom:6 }}>
                    {i===0?"▶ ":"  "}{s.title} — 🎤 {s.singer} (Table {s.table})
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#08001a 0%,#160030 50%,#0a0018 100%)", fontFamily:"Georgia,serif", color:"#fff", position:"relative", overflow:"hidden" }}>
      <style>{css}</style>
      {notes.map((n, i) => (<div key={i} className="fn" style={{ left:n.left, animationDelay:n.delay, fontSize:n.size, opacity:n.op }}>♪</div>))}
      {toast && (
        <div style={{ position:"fixed", top:18, right:18, zIndex:1100, background: toast.type==="err"?"rgba(220,40,40,.92)":"rgba(30,180,90,.92)", padding:"11px 22px", borderRadius:14, fontWeight:"bold", fontSize:".9rem", animation:"toastIn .3s ease", maxWidth:300 }}>
          {toast.msg}
        </div>
      )}
      <div style={{ textAlign:"center", padding:"28px 16px 18px", borderBottom:"1px solid rgba(255,0,255,0.12)", position:"relative", zIndex:10 }}>
        <h1 className="glow" style={{ fontSize:"clamp(1.6rem,5vw,2.3rem)", margin:0, letterSpacing:3 }}>HURRICANE</h1>
        <p style={{ color:"rgba(255,255,255,0.35)", margin:"4px 0 14px", letterSpacing:2, fontSize:".72rem" }}>SONG REQUEST SYSTEM</p>
        <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
          {[
            { k:"home", label:"🏠 Home" },
            { k:"request", label:"🎵 Request Song" },
            { k:"mystatus", label:`📋 My Songs${myReqs.length?` (${myReqs.length})`:""}` },
            { k:"queue", label:`🎶 Queue (${queue.length})` },
            ...(isDJMode ? [{ k:"admin", label:"🔐 DJ" }] : []),
          ].map(({ k, label }) => (
            <button key={k} className={`tab ${view===k?"on":""}`} onClick={() => setView(k)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ position:"relative", zIndex:10, padding:"22px 14px", maxWidth:720, margin:"0 auto" }}>

        {view === "home" && (
          <div style={{ animation:"slideIn .3s ease" }}>
            <div className="card" style={{ textAlign:"center", marginBottom:18 }}>
              <div style={{ fontSize:"3.5rem", marginBottom:10 }}>🎶</div>
              <h2 style={{ margin:"0 0 6px", fontSize:"1.4rem" }}>Welcome to Hurricane!</h2>
              <p style={{ color:"rgba(255,255,255,0.55)", margin:"0 0 22px", fontSize:".9rem" }}>Request any song and sing karaoke on the big screen</p>
              {currentSong && (
                <div className="card-green" style={{ marginBottom:18, textAlign:"left" }}>
                  <p style={{ margin:"0 0 6px", fontSize:".72rem", color:"rgba(255,255,255,0.5)" }}><span className="live-dot"/>NOW PLAYING</p>
                  <div style={{ fontWeight:"bold", fontSize:".9rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{currentSong.title}</div>
                  <div style={{ color:"rgba(255,255,255,0.5)", fontSize:".78rem" }}>🎤 {currentSong.singer} · Table {currentSong.table}</div>
                </div>
              )}
              <div style={{ marginBottom:18 }}>
                <p style={{ margin:"0 0 8px", fontWeight:"bold", color:"#ff88ff", fontSize:".9rem" }}>Your name:</p>
                <input className="inp" placeholder="What's your name?" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth:280, margin:"0 auto", display:"block" }}/>
              </div>
              {tableFromURL !== null ? (
                <div style={{ marginBottom:8 }}>
                  <p style={{ margin:"0 0 8px", fontWeight:"bold", color:"#ff88ff", fontSize:".9rem" }}>Your table:</p>
                  <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:64, height:64, borderRadius:16, border:"2px solid #ff00ff", background:"rgba(255,0,255,0.22)", fontWeight:"bold", fontSize:"1.6rem", color:"#ff88ff" }}>{tableFromURL}</div>
                  <p style={{ color:"rgba(255,255,255,0.45)", fontSize:".8rem", marginTop:8 }}>🔒 Table locked by QR</p>
                </div>
              ) : (
                <>
                  <p style={{ margin:"0 0 10px", fontWeight:"bold", color:"#ff88ff", fontSize:".9rem" }}>Select your table:</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
                    {TABLES.map((t) => (
                      <button key={t} onClick={() => setTable(t)} style={{ width:48, height:48, borderRadius:13, border: table===t?"2px solid #ff00ff":"1px solid rgba(255,255,255,0.18)", background: table===t?"rgba(255,0,255,0.22)":"rgba(255,255,255,0.04)", color: table===t?"#ff88ff":"rgba(255,255,255,0.65)", cursor:"pointer", fontWeight:"bold", fontSize:"1rem", transition:"all .2s" }}>{t}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {name && (tableFromURL !== null || table) && (
              <div style={{ textAlign:"center", animation:"slideIn .3s ease" }}>
                <p style={{ color:"rgba(255,255,255,0.55)", marginBottom:14, fontSize:".9rem" }}>Hi <strong style={{ color:"#ff88ff" }}>{name}</strong> · Table <strong style={{ color:"#ff88ff" }}>{tableFromURL??table}</strong></p>
                <button className="btn btn-p" onClick={() => setView("request")}>🎵 Request a Song</button>
              </div>
            )}
          </div>
        )}

        {view === "request" && (
          <div style={{ animation:"slideIn .3s ease" }}>
            {(!name || (tableFromURL===null && !table)) && (
              <div className="card-yellow" style={{ textAlign:"center", marginBottom:14 }}>
                ⚠️ First enter your name and table in <strong style={{ color:"#ffcc00", cursor:"pointer" }} onClick={() => setView("home")}>Home</strong>
              </div>
            )}
            <div className="card" style={{ marginBottom:14 }}>
              <p style={{ margin:"0 0 10px", fontWeight:"bold", color:"#ff88ff", fontSize:".9rem" }}>🔍 Search your song:</p>
              <div style={{ display:"flex", gap:8 }}>
                <input className="inp" placeholder="Ex: Despacito, My Way, Thriller..." value={songQ} onChange={(e) => setSongQ(e.target.value)} onKeyDown={(e) => e.key==="Enter" && doSearch()} style={{ flex:1 }}/>
                <button className="btn btn-p" style={{ padding:"10px 16px", whiteSpace:"nowrap" }} onClick={doSearch} disabled={searching}>{searching?"...":"🔍"}</button>
              </div>
              <p style={{ color:"rgba(255,255,255,0.3)", fontSize:".75rem", margin:"8px 0 0" }}>Search by song name or artist</p>
            </div>
            {searching && (<div style={{ textAlign:"center", padding:30 }}><div className="spin"/><p style={{ color:"rgba(255,255,255,0.45)", marginTop:12, fontSize:".85rem" }}>Searching on YouTube...</p></div>)}
            {ytFailed && (
              <div className="card" style={{ textAlign:"center", padding:24, borderColor:"rgba(255,100,0,0.3)" }}>
                <div style={{ fontSize:"2rem", marginBottom:8 }}>⚠️</div>
                <p style={{ color:"rgba(255,255,255,0.6)", fontSize:".85rem", marginBottom:14 }}>Could not connect.<br/>Please try again.</p>
                <button className="btn btn-p" onClick={doSearch} disabled={searching}>🔄 Retry</button>
              </div>
            )}
            {!searching && !ytFailed && ytResults.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <p style={{ color:"rgba(255,255,255,0.4)", fontSize:".8rem", marginBottom:10 }}>{pickedVideo?"✅ Video selected — you can change it or send the request:":"Choose the karaoke video you want to sing:"}</p>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                  {ytResults.map((v) => (
                    <div key={v.id} className={`vcard ${pickedVideo?.id===v.id?"sel":""}`} onClick={() => setPickedVideo(v)}>
                      {!!v.thumb && <img src={v.thumb} alt="" style={{ width:80, height:45, borderRadius:8, objectFit:"cover", flexShrink:0 }} onError={(e) => (e.currentTarget.style.display="none")}/>}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:"bold", fontSize:".82rem", lineHeight:1.3, marginBottom:3, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{v.title}</div>
                        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:".72rem" }}>{v.author}</div>
                      </div>
                      {pickedVideo?.id===v.id ? <span style={{ fontSize:"1.3rem", flexShrink:0 }}>✅</span> : <span style={{ fontSize:".75rem", color:"rgba(255,255,255,0.35)", flexShrink:0 }}>Select</span>}
                    </div>
                  ))}
                </div>
                {pickedVideo && (
                  <div style={{ textAlign:"center" }}>
                    <div className="card-green" style={{ marginBottom:12, textAlign:"left" }}>
                      <p style={{ margin:0, fontSize:".83rem", color:"rgba(255,255,255,0.7)" }}>🎬 <strong style={{ color:"#00cc66" }}>{pickedVideo.title}</strong></p>
                    </div>
                    <button className="btn btn-p" onClick={submitReq} style={{ width:"100%" }} disabled={submitting}>{submitting?"Sending...":"🎤 Send Request to DJ"}</button>
                  </div>
                )}
              </div>
            )}
            {!searching && !ytFailed && ytResults.length===0 && !songQ && (
              <div className="card" style={{ textAlign:"center", padding:32, color:"rgba(255,255,255,0.35)" }}>
                <div style={{ fontSize:"2.5rem", marginBottom:8 }}>🎵</div>
                Type a song name and press 🔍
              </div>
            )}
          </div>
        )}

        {view === "mystatus" && (
          <div style={{ animation:"slideIn .3s ease" }}>
            <h2 style={{ margin:"0 0 16px", color:"#ff88ff", fontSize:"1.1rem" }}>📋 My Requests</h2>
            {(() => {
              const visibleReqs = isDJMode && adminOk ? [...pending, ...queue].map(r => ({ ...r, _source:"live" })) : tableFromURL!==null ? myReqs.filter(r => r.table===tableFromURL) : myReqs;
              if (visibleReqs.length===0) return (
                <div className="card" style={{ textAlign:"center", padding:36 }}>
                  <div style={{ fontSize:"2.5rem", marginBottom:10 }}>🎵</div>
                  <p style={{ color:"rgba(255,255,255,0.45)" }}>{isDJMode&&adminOk?"No songs yet":"You haven't requested any songs yet"}</p>
                  {!isDJMode && <button className="btn btn-p" onClick={() => setView("request")} style={{ marginTop:14 }}>Request a Song</button>}
                </div>
              );
              const listToShow = isDJMode&&adminOk ? visibleReqs : [...visibleReqs].reverse();
              return (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {listToShow.map((req, i) => {
                    const status = isDJMode&&adminOk ? (pending.some(p=>p.fbKey===req.fbKey)?"pending":queue.some(q=>q.fbKey===req.fbKey)?"approved":"done") : statusByRequest(req);
                    return (
                      <div key={req.fbKey||i} className="card" style={{ padding:"14px 18px" }}>
                        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10 }}>
                          {!!req.thumb && <img src={req.thumb} alt="" style={{ width:72, height:40, borderRadius:7, objectFit:"cover", flexShrink:0 }} onError={(e) => (e.currentTarget.style.display="none")}/>}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:"bold", fontSize:".88rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{req.title}</div>
                            <div style={{ color:"rgba(255,255,255,0.45)", fontSize:".75rem", marginTop:3 }}>{req.author}</div>
                          </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                          <span style={{ fontSize:".72rem", color:"rgba(255,255,255,0.4)" }}>Table {req.table}</span>
                          <span className={`badge ${status==="pending"?"badge-y":status==="approved"||status==="playing"?"badge-g":"badge-r"}`}>
                            {status==="pending"?"⏳ Pending":status==="approved"?"✅ In Queue":status==="playing"?"🎤 Singing Now":"✅ Done"}
                          </span>
                        </div>
                        {isDJMode&&adminOk&&status==="done" && (
                          <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
                            <button className="btn btn-p" style={{ padding:"7px 14px", fontSize:".82rem", background:"linear-gradient(135deg,#ff6600,#cc3300)" }} onClick={() => playNow(req)} disabled={!!workingId}>▶ Play Now</button>
                            <button className="btn btn-p" style={{ padding:"7px 14px", fontSize:".82rem", background:"linear-gradient(135deg,#00aaff,#0055cc)" }} onClick={() => requeueSong(req)} disabled={!!workingId}>➕ Add to Queue</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!isDJMode && <button className="btn btn-p" onClick={() => setView("request")} style={{ marginTop:4 }}>+ Request Another Song</button>}
                </div>
              );
            })()}
          </div>
        )}

        {view === "queue" && (
          <div style={{ animation:"slideIn .3s ease" }}>
            <h2 style={{ margin:"0 0 16px", color:"#ff88ff", fontSize:"1.1rem" }}>🎶 Song Queue</h2>
            {currentSong && (
              <div className="card-green" style={{ marginBottom:14 }}>
                <p style={{ margin:"0 0 6px", fontSize:".72rem", color:"rgba(255,255,255,0.5)" }}><span className="live-dot"/>NOW PLAYING ON TV</p>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  {!!currentSong.thumb && <img src={currentSong.thumb} alt="" style={{ width:64, height:36, borderRadius:7, objectFit:"cover" }} onError={(e) => (e.currentTarget.style.display="none")}/>}
                  <div>
                    <div style={{ fontWeight:"bold", fontSize:".9rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:240 }}>{currentSong.title}</div>
                    <div style={{ color:"rgba(255,255,255,0.5)", fontSize:".78rem" }}>🎤 {currentSong.singer} · Table {currentSong.table}</div>
                  </div>
                </div>
              </div>
            )}
            {queue.length===0 ? (
              <div className="card" style={{ textAlign:"center", padding:36 }}>
                <div style={{ fontSize:"2.5rem", marginBottom:10 }}>🎵</div>
                <p style={{ color:"rgba(255,255,255,0.45)" }}>Queue is empty — request your song!</p>
                <button className="btn btn-p" onClick={() => setView("request")} style={{ marginTop:14 }}>Request a Song</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {queue.map((entry, i) => (
                  <div key={entry.fbKey} className="card" style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <div style={{ fontSize:"1.3rem", width:28, textAlign:"center", color: i===0?"#ffcc00":"rgba(255,255,255,.5)" }}>{i+1}</div>
                      {!!entry.thumb && <img src={entry.thumb} alt="" style={{ width:70, height:40, borderRadius:7, objectFit:"cover", flexShrink:0 }} onError={(e) => (e.currentTarget.style.display="none")}/>}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:"bold", fontSize:".86rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.title}</div>
                        <div style={{ color:"rgba(255,255,255,0.45)", fontSize:".74rem" }}>🎤 {entry.singer} · Table {entry.table}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "admin" && isDJMode && (
          <div style={{ animation:"slideIn .3s ease" }}>
            {!adminOk ? (
              <div className="card" style={{ maxWidth:420, margin:"0 auto" }}>
                <h2 style={{ marginTop:0, color:"#ff88ff" }}>🔐 DJ Login</h2>
                <input className="inp" type="password" placeholder="Admin password" value={adminPwd} onChange={(e) => setAdminPwd(e.target.value)} onKeyDown={(e) => e.key==="Enter" && loginAdmin()}/>
                {adminErr && <p style={{ color:"#ff8888", fontSize:".82rem" }}>Invalid password</p>}
                <button className="btn btn-p" onClick={loginAdmin} style={{ marginTop:10, width:"100%" }}>Enter</button>
              </div>
            ) : (
              <div>
                <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
                  {[
                    { key:"pending", label:`Pending (${pending.length})` },
                    { key:"queue", label:`Queue (${queue.length})` },
                    { key:"now", label:"Now Playing" },
                    { key:"history", label:"🔁 History" },
                    { key:"tvcontrols", label:"🎤 Start Karaoke TV" },
                  ].map((tab) => (
                    <button key={tab.key} className={`tab ${djTab===tab.key?"on":""}`} onClick={() => setDjTab(tab.key)}>{tab.label}</button>
                  ))}
                </div>

                {djTab === "pending" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {pending.length===0 ? (
                      <div className="card" style={{ textAlign:"center" }}>No pending requests</div>
                    ) : (
                      pending.map((req) => (
                        <div key={req.fbKey} className="card">
                          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                            {!!req.thumb && <img src={req.thumb} alt="" style={{ width:90, height:50, borderRadius:8, objectFit:"cover" }} onError={(e) => (e.currentTarget.style.display="none")}/>}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontWeight:"bold", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{req.title}</div>
                              <div style={{ color:"rgba(255,255,255,.55)", fontSize:".8rem" }}>🎤 {req.singer} · Table {req.table}</div>
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:8, marginTop:12 }}>
                            <button className="btn btn-p" onClick={() => approve(req)} disabled={workingId===req.fbKey}>Approve</button>
                            <button className="btn-r" onClick={() => reject(req)} disabled={workingId===req.fbKey}>Reject</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {djTab === "queue" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {queue.length===0 ? (
                      <div className="card" style={{ textAlign:"center" }}>Queue is empty</div>
                    ) : (
                      <>
                        <p style={{ color:"rgba(255,255,255,0.35)", fontSize:".75rem", margin:"0 0 4px", textAlign:"center" }}>✋ Mantén apretado un item para reordenar</p>
                        <div ref={queueListRef} style={{ overflowY:"auto", maxHeight:"60vh" }}>
                          {queue.map((entry, index) => (
                            <div key={entry.fbKey} className="card"
                              style={{ opacity:dragIndex===index?0.4:1, border:dragOverIndex===index?"2px solid #ff00ff":undefined, transform:dragOverIndex===index?"scale(1.02)":undefined, transition:"all 0.15s ease", cursor:dragIndex!==null?"grabbing":"default", userSelect:"none" }}
                              onTouchStart={() => { longPressTimer.current = setTimeout(() => { isDragging.current=true; setDragIndex(index); if(navigator.vibrate) navigator.vibrate(60); }, 500); }}
                              onTouchMove={(e) => {
                                if (!isDragging.current) { clearTimeout(longPressTimer.current); return; }
                                const touch = e.touches[0];
                                const ZONE = 120;
                                const container = queueListRef.current;
                                const rect = container ? container.getBoundingClientRect() : null;
                                const topEdge = rect ? rect.top+ZONE : ZONE;
                                const bottomEdge = rect ? rect.bottom-ZONE : window.innerHeight-ZONE;
                                if (touch.clientY > bottomEdge) { startAutoScroll(1); }
                                else if (touch.clientY < topEdge) { startAutoScroll(-1); }
                                else { stopAutoScroll(); }
                                const els = document.elementsFromPoint(touch.clientX, touch.clientY);
                                const cardEl = els.find(el => el.dataset && el.dataset.qindex!==undefined);
                                if (cardEl) { const over=parseInt(cardEl.dataset.qindex); if(!isNaN(over)&&over!==dragOverIndex) setDragOverIndex(over); }
                              }}
                              onTouchEnd={() => {
                                clearTimeout(longPressTimer.current); stopAutoScroll();
                                if (isDragging.current&&dragIndex!==null&&dragOverIndex!==null&&dragIndex!==dragOverIndex) reorderQueue(dragIndex, dragOverIndex);
                                isDragging.current=false; setDragIndex(null); setDragOverIndex(null);
                              }}
                              data-qindex={index}
                            >
                              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                                <div style={{ fontSize:"1.1rem", color:"rgba(255,255,255,0.3)", flexShrink:0, cursor:"grab" }}>☰</div>
                                <div style={{ fontSize:"1.2rem", width:24, textAlign:"center" }}>{index+1}</div>
                                {!!entry.thumb && <img src={entry.thumb} alt="" style={{ width:90, height:50, borderRadius:8, objectFit:"cover" }} onError={(e) => (e.currentTarget.style.display="none")}/>}
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ fontWeight:"bold", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.title}</div>
                                  <div style={{ color:"rgba(255,255,255,.55)", fontSize:".8rem" }}>🎤 {entry.singer} · Table {entry.table}</div>
                                </div>
                              </div>
                              <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
                                <button className="btn btn-p" onClick={() => playSong(entry)} disabled={!!workingId}>▶ Play</button>
                                <button className="btn btn-p" style={{ background:"linear-gradient(135deg,#00aaff,#0055cc)" }} onClick={() => requeueSong(entry)} disabled={!!workingId}>🔁 Repeat</button>
                                <button className="btn-r" onClick={() => removeQ(entry)} disabled={workingId===entry.fbKey}>✕ Remove</button>
                                {index>0 && <button className="btn btn-p" style={{ background:"linear-gradient(135deg,#666,#444)", padding:"8px 12px" }} onClick={() => reorderQueue(index, index-1)} disabled={!!workingId}>⬆</button>}
                                {index<queue.length-1 && <button className="btn btn-p" style={{ background:"linear-gradient(135deg,#666,#444)", padding:"8px 12px" }} onClick={() => reorderQueue(index, index+1)} disabled={!!workingId}>⬇</button>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {djTab === "tvcontrols" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div className="card" style={{ background:"rgba(255,0,255,.1)", border:"2px solid rgba(255,0,255,.5)", textAlign:"center" }}>
                      <h3 style={{ marginTop:0, color:"#ff88ff", fontSize:"1rem", letterSpacing:2 }}>🎤 KARAOKE NIGHT</h3>
                      <p style={{ color:"rgba(255,255,255,.45)", fontSize:".78rem", marginBottom:14 }}>Opens native karaoke apps on both Fire TVs</p>
                      <button
                        className="btn btn-p"
                        style={{ padding:"14px 32px", fontSize:"1rem", width:"100%", letterSpacing:1 }}
                        onClick={() => {
                          fetch("http://192.168.3.13:3500/api/tv/2/karaoke", { method:"POST" })
                            .then(() => fetch("http://192.168.3.13:3500/api/tv/1/karaoke", { method:"POST" }))
                            .then(() => toast$("🎤 Karaoke Night Started!"))
                            .catch(() => toast$("❌ Error — check server", "err"));
                        }}
                      >
                        🎤 Start Karaoke Night
                      </button>
                    </div>
                  </div>
                )}

                {djTab === "history" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {(() => {
                      const done = myReqs.filter(r => statusByRequest(r)==="done");
                      if (done.length===0) return <div className="card" style={{ textAlign:"center" }}>No played songs yet</div>;
                      return [...done].reverse().map((req, i) => (
                        <div key={req.fbKey||i} className="card" style={{ padding:"14px 18px" }}>
                          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10 }}>
                            {!!req.thumb && <img src={req.thumb} alt="" style={{ width:72, height:40, borderRadius:7, objectFit:"cover", flexShrink:0 }} onError={(e) => (e.currentTarget.style.display="none")}/>}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontWeight:"bold", fontSize:".88rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{req.title}</div>
                              <div style={{ color:"rgba(255,255,255,0.45)", fontSize:".75rem", marginTop:3 }}>🎤 {req.singer} · Table {req.table}</div>
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                            <button className="btn btn-p" style={{ padding:"7px 14px", fontSize:".82rem", background:"linear-gradient(135deg,#ff6600,#cc3300)" }} onClick={() => playNow(req)} disabled={!!workingId}>▶ Play Now</button>
                            <button className="btn btn-p" style={{ padding:"7px 14px", fontSize:".82rem", background:"linear-gradient(135deg,#00aaff,#0055cc)" }} onClick={() => requeueSong(req)} disabled={!!workingId}>➕ Add to Queue</button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {djTab === "now" && (
                  <div className="card">
                    {currentSong ? (
                      <>
                        <h3 style={{ marginTop:0, color:"#00cc66" }}>Now Playing</h3>
                        <div style={{ fontWeight:"bold", marginBottom:6 }}>{currentSong.title}</div>
                        <div style={{ color:"rgba(255,255,255,.55)", marginBottom:12 }}>🎤 {currentSong.singer} · Table {currentSong.table}</div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          <button className="btn-r" onClick={stopSong} disabled={workingId==="__stop__"}>⏹ Stop</button>
                          <button className="btn btn-p" style={{ padding:"8px 16px", fontSize:".85rem" }} onClick={restartSong} disabled={workingId==="__restart__"}>🔄 Restart</button>
                          {queue.length>0 && <button className="btn btn-p" style={{ padding:"8px 16px", fontSize:".85rem", background:"linear-gradient(135deg,#00cc66,#009944)" }} onClick={() => playSong(queue[0])} disabled={!!workingId}>⏭ Next</button>}
                        </div>
                      </>
                    ) : (
                      <div>No song is currently playing</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
