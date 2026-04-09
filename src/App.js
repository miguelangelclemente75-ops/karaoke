import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push, remove } from "firebase/database";

// ─── Firebase Config ───────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCCp5XcNOw6Kbs_wv5Mg2LojV8BY2rTrbI",
  authDomain: "karaoke-app-1e2ce.firebaseapp.com",
  databaseURL: "https://karaoke-app-1e2ce-default-rtdb.firebaseio.com",
  projectId: "karaoke-app-1e2ce",
  storageBucket: "karaoke-app-1e2ce.firebasestorage.app",
  messagingSenderId: "404006629002",
  appId: "1:404006629002:web:dd4ec169ad20b473798773"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ─── YouTube API ───────────────────────────────────────────
const YT_API_KEY = "AIzaSyAg-83L9M6WtTFP942wcyamiVs57Ilt-t0";

async function searchYT(query) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=6&key=${YT_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.items || data.items.length === 0) return [];
    return data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      author: item.snippet.channelTitle,
      thumb: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    }));
  } catch { return null; }
}

const TABLES = [1, 2, 3, 4, 5, 6, 7, 8];
const ADMIN_PASSWORD = "karaoke2024";

// ─── CSS ───────────────────────────────────────────────────
const css = `
  @keyframes floatNote{0%{transform:translateY(100vh) rotate(0deg);opacity:0}10%{opacity:0.15}90%{opacity:0.08}100%{transform:translateY(-80px) rotate(360deg);opacity:0}}
  @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
  @keyframes slideIn{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes toastIn{from{transform:translateX(110px);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
  .fn{position:fixed;color:#ff00ff;animation:floatNote 9s linear infinite;pointer-events:none;z-index:0}
  .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:18px;padding:20px;animation:slideIn .3s ease}
  .card-green{background:rgba(0,200,100,0.07);border:1px solid rgba(0,200,100,0.25);border-radius:18px;padding:20px}
  .card-yellow{background:rgba(255,200,0,0.07);border:1px solid rgba(255,200,0,0.25);border-radius:18px;padding:16px}
  .card-red{background:rgba(255,50,50,0.07);border:1px solid rgba(255,50,50,0.25);border-radius:18px;padding:16px}
  .glow{background:linear-gradient(90deg,#ff00ff,#00ffff,#ff00ff);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 3s linear infinite}
  .btn{border:none;color:#fff;border-radius:50px;cursor:pointer;font-family:Georgia,serif;font-weight:bold;transition:all .2s;letter-spacing:.5px}
  .btn-p{background:linear-gradient(135deg,#ff00ff,#9900ff);padding:11px 26px;font-size:.95rem}
  .btn-p:hover{transform:scale(1.04);box-shadow:0 0 18px rgba(255,0,255,0.45)}
  .btn-g{background:linear-gradient(135deg,#00cc66,#009944);padding:9px 18px;font-size:.85rem}
  .btn-g:hover{transform:scale(1.04)}
  .btn-r{background:rgba(255,50,50,0.2);border:1px solid rgba(255,50,50,0.4);color:#ff8888;padding:8px 14px;border-radius:20px;cursor:pointer;font-family:Georgia,serif;transition:all .2s}
  .tab{background:transparent;border:1px solid rgba(255,255,255,0.18);color:rgba(255,255,255,0.55);padding:8px 18px;border-radius:50px;cursor:pointer;font-family:Georgia,serif;transition:all .2s;font-size:.85rem}
  .tab.on{background:linear-gradient(135deg,#ff00ff,#9900ff);color:#fff;border-color:transparent}
  .inp{background:rgba(255,255,255,0.05);border:1px solid rgba(255,0,255,0.3);color:#fff;padding:10px 15px;border-radius:12px;font-family:Georgia,serif;font-size:.95rem;outline:none;width:100%;box-sizing:border-box}
  .inp:focus{border-color:#ff00ff;box-shadow:0 0 10px rgba(255,0,255,0.2)}
  .inp::placeholder{color:rgba(255,255,255,0.28)}
  .vcard{cursor:pointer;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:10px 12px;background:rgba(255,255,255,0.03);transition:all .2s;display:flex;gap:10px;align-items:center}
  .vcard:hover{border-color:#ff00ff;background:rgba(255,0,255,0.1);transform:translateY(-2px)}
  .vcard.sel{border-color:#00cc66;background:rgba(0,200,100,0.12)}
  .spin{width:28px;height:28px;border:3px solid rgba(255,0,255,0.15);border-top-color:#ff00ff;border-radius:50%;animation:spin .75s linear infinite;margin:0 auto}
  .badge{display:inline-block;font-size:.65rem;padding:2px 10px;border-radius:20px;font-weight:bold;letter-spacing:.5px}
  .badge-y{background:rgba(255,200,0,0.2);border:1px solid rgba(255,200,0,0.4);color:#ffcc00}
  .badge-g{background:rgba(0,200,100,0.2);border:1px solid rgba(0,200,100,0.4);color:#00cc66}
  .badge-r{background:rgba(255,50,50,0.2);border:1px solid rgba(255,50,50,0.4);color:#ff6666}
  .live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff4444;animation:blink 1s ease infinite;margin-right:6px}
`;

export default function App() {
  // Detect TV mode
  const isTVMode = window.location.search.includes("modo=tv");

  const [view, setView] = useState("home");
  const [name, setName] = useState("");
  const [table, setTable] = useState(null);
  const [songQ, setSongQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [ytResults, setYtResults] = useState([]);
  const [ytFailed, setYtFailed] = useState(false);
  const [pickedVideo, setPickedVideo] = useState(null);
  const [adminOk, setAdminOk] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminErr, setAdminErr] = useState(false);
  const [djTab, setDjTab] = useState("pending");
  const [toast, setToast] = useState(null);
  const [myReqs, setMyReqs] = useState([]);

  // Firebase state
  const [pending, setPending] = useState([]);
  const [queue, setQueue] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);

  const notes = Array.from({ length: 7 }, (_, i) => ({
    left: `${8 + i * 13}%`, delay: `${i * 1.1}s`,
    size: `${1.1 + (i % 3) * 0.4}rem`, op: 0.12 + (i % 3) * 0.07,
  }));

  const toast$ = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  // ── Firebase listeners ──────────────────────────────────
  useEffect(() => {
    // Listen to pending requests
    const pendingRef = ref(db, "pending");
    const unsubPending = onValue(pendingRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([key, val]) => ({ ...val, fbKey: key }));
        setPending(list);
      } else {
        setPending([]);
      }
    });

    // Listen to queue
    const queueRef = ref(db, "queue");
    const unsubQueue = onValue(queueRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([key, val]) => ({ ...val, fbKey: key }));
        setQueue(list);
      } else {
        setQueue([]);
      }
    });

    // Listen to current song (for TV)
    const currentRef = ref(db, "current");
    const unsubCurrent = onValue(currentRef, (snap) => {
      const data = snap.val();
      setCurrentSong(data || null);
    });

    return () => {
      unsubPending();
      unsubQueue();
      unsubCurrent();
    };
  }, []);

  // ── YouTube search ──────────────────────────────────────
  const doSearch = async () => {
    if (!songQ.trim()) return;
    setSearching(true);
    setYtResults([]);
    setPickedVideo(null);
    setYtFailed(false);
    const results = await searchYT(songQ + " karaoke con letra");
    setSearching(false);
    if (results === null) { setYtFailed(true); }
    else if (results.length === 0) { toast$("Sin resultados, intenta con otro nombre", "err"); }
    else { setYtResults(results); }
  };

  // ── Submit request ──────────────────────────────────────
  const submitReq = async () => {
    if (!name.trim()) { toast$("Escribe tu nombre", "err"); return; }
    if (!table) { toast$("Selecciona tu mesa", "err"); return; }
    if (!pickedVideo) { toast$("Elige un video primero", "err"); return; }
    const req = {
      title: pickedVideo.title,
      author: pickedVideo.author,
      videoId: pickedVideo.id,
      thumb: pickedVideo.thumb,
      singer: name.trim(),
      table,
      status: "pending",
      timestamp: Date.now(),
    };
    await push(ref(db, "pending"), req);
    setMyReqs(r => [...r, { ...req, id: Date.now() }]);
    setSongQ(""); setYtResults([]); setPickedVideo(null);
    toast$("🎤 Solicitud enviada — espera aprobación del DJ!");
    setView("mystatus");
  };

  // ── DJ: approve ─────────────────────────────────────────
  const approve = async (req) => {
    await remove(ref(db, `pending/${req.fbKey}`));
    await push(ref(db, "queue"), {
      title: req.title, author: req.author, videoId: req.videoId,
      thumb: req.thumb, singer: req.singer, table: req.table,
      timestamp: Date.now(),
    });
    toast$("✅ Aprobada");
  };

  // ── DJ: reject ──────────────────────────────────────────
  const reject = async (req) => {
    await remove(ref(db, `pending/${req.fbKey}`));
    toast$("❌ Rechazada", "err");
  };

  // ── DJ: remove from queue ───────────────────────────────
  const removeQ = async (req) => {
    await remove(ref(db, `queue/${req.fbKey}`));
    toast$("Removida", "err");
  };

  // ── DJ: play song ───────────────────────────────────────
  const playSong = async (entry) => {
    await set(ref(db, "current"), {
      title: entry.title, author: entry.author, videoId: entry.videoId,
      thumb: entry.thumb, singer: entry.singer, table: entry.table,
    });
    await remove(ref(db, `queue/${entry.fbKey}`));
    setDjTab("now");
    toast$("▶ Reproduciendo en TV!");
  };

  // ── DJ: stop song ───────────────────────────────────────
  const stopSong = async () => {
    await set(ref(db, "current"), null);
    toast$("⏹ Detenido", "err");
  };

  const loginAdmin = () => {
    if (adminPwd === ADMIN_PASSWORD) { setAdminOk(true); setAdminErr(false); setAdminPwd(""); }
    else { setAdminErr(true); setAdminPwd(""); }
  };

  // ══════════════════════════════════════════════════════════
  // TV MODE — fullscreen player only
  // ══════════════════════════════════════════════════════════
  if (isTVMode) {
    return (
      <div style={{ width:"100vw", height:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"Georgia,serif" }}>
        <style>{css}</style>
        {currentSong ? (
          <div style={{ width:"100%", height:"100%" }}>
            <iframe style={{ width:"100%", height:"100%", border:"none" }}
              src={`https://www.youtube.com/embed/${currentSong.videoId}?autoplay=1&rel=0&modestbranding=1`}
              allow="autoplay; fullscreen" allowFullScreen title="Karaoke" />
          </div>
        ) : (
          <div style={{ textAlign:"center", color:"#fff" }}>
            <div style={{ fontSize:"6rem", marginBottom:20 }}>🎤</div>
            <h1 style={{ fontSize:"3rem", marginBottom:10, background:"linear-gradient(90deg,#ff00ff,#00ffff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              KARAOKE NIGHT
            </h1>
            <p style={{ color:"rgba(255,255,255,0.5)", fontSize:"1.2rem", marginBottom:30 }}>
              Escanea el QR de tu mesa para pedir una canción
            </p>
            {queue.length > 0 && (
              <div style={{ marginTop:20 }}>
                <p style={{ color:"rgba(255,255,255,0.4)", fontSize:".9rem", marginBottom:12 }}>PRÓXIMAS CANCIONES:</p>
                {queue.slice(0,3).map((s,i) => (
                  <div key={s.fbKey} style={{ color:i===0?"#ffcc00":"rgba(255,255,255,0.5)", fontSize:i===0?"1.1rem":".9rem", marginBottom:6 }}>
                    {i===0?"▶ ":"  "}{s.title} — 🎤 {s.singer} (Mesa {s.table})
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // NORMAL MODE
  // ══════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#08001a 0%,#160030 50%,#0a0018 100%)", fontFamily:"Georgia,serif", color:"#fff", position:"relative", overflow:"hidden" }}>
      <style>{css}</style>

      {notes.map((n,i) => <div key={i} className="fn" style={{left:n.left,animationDelay:n.delay,fontSize:n.size,opacity:n.op}}>♪</div>)}

      {toast && (
        <div style={{position:"fixed",top:18,right:18,zIndex:1100,background:toast.type==="err"?"rgba(220,40,40,0.92)":"rgba(30,180,90,0.92)",padding:"11px 22px",borderRadius:14,fontWeight:"bold",fontSize:".9rem",animation:"toastIn .3s ease",maxWidth:300}}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{textAlign:"center",padding:"28px 16px 18px",borderBottom:"1px solid rgba(255,0,255,0.12)",position:"relative",zIndex:10}}>
        <h1 className="glow" style={{fontSize:"clamp(1.6rem,5vw,2.3rem)",margin:0,letterSpacing:3}}>🎤 KARAOKE NIGHT</h1>
        <p style={{color:"rgba(255,255,255,0.35)",margin:"4px 0 14px",letterSpacing:2,fontSize:".72rem"}}>SISTEMA DE SOLICITUDES</p>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          {[
            {k:"home",    label:"🏠 Inicio"},
            {k:"request", label:"🎵 Pedir canción"},
            {k:"mystatus",label:`📋 Mis solicitudes${myReqs.length?` (${myReqs.length})`:""}`},
            {k:"queue",   label:`🎶 Cola (${queue.length})`},
            {k:"admin",   label:"🔐 DJ"},
          ].map(({k,label}) => (
            <button key={k} className={`tab ${view===k?"on":""}`} onClick={() => setView(k)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{position:"relative",zIndex:10,padding:"22px 14px",maxWidth:680,margin:"0 auto"}}>

        {/* ══ HOME ══ */}
        {view==="home" && (
          <div style={{animation:"slideIn .3s ease"}}>
            <div className="card" style={{textAlign:"center",marginBottom:18}}>
              <div style={{fontSize:"3.5rem",marginBottom:10}}>🎶</div>
              <h2 style={{margin:"0 0 6px",fontSize:"1.4rem"}}>¡Bienvenido!</h2>
              <p style={{color:"rgba(255,255,255,0.55)",margin:"0 0 22px",fontSize:".9rem"}}>Pide cualquier canción y canta con el karaoke en la pantalla grande</p>
              {currentSong && (
                <div className="card-green" style={{marginBottom:18,textAlign:"left"}}>
                  <p style={{margin:"0 0 6px",fontSize:".72rem",color:"rgba(255,255,255,0.5)"}}><span className="live-dot"/>EN REPRODUCCIÓN AHORA</p>
                  <div style={{fontWeight:"bold",fontSize:".9rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentSong.title}</div>
                  <div style={{color:"rgba(255,255,255,0.5)",fontSize:".78rem"}}>🎤 {currentSong.singer} · Mesa {currentSong.table}</div>
                </div>
              )}
              <div style={{marginBottom:18}}>
                <p style={{margin:"0 0 8px",fontWeight:"bold",color:"#ff88ff",fontSize:".9rem"}}>Tu nombre:</p>
                <input className="inp" placeholder="¿Cómo te llamas?" value={name} onChange={e => setName(e.target.value)} style={{maxWidth:280,margin:"0 auto",display:"block"}} />
              </div>
              <p style={{margin:"0 0 10px",fontWeight:"bold",color:"#ff88ff",fontSize:".9rem"}}>Selecciona tu mesa:</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
                {TABLES.map(t => (
                  <button key={t} onClick={() => setTable(t)} style={{width:48,height:48,borderRadius:13,border:table===t?"2px solid #ff00ff":"1px solid rgba(255,255,255,0.18)",background:table===t?"rgba(255,0,255,0.22)":"rgba(255,255,255,0.04)",color:table===t?"#ff88ff":"rgba(255,255,255,0.65)",cursor:"pointer",fontWeight:"bold",fontSize:"1rem",transition:"all .2s"}}>{t}</button>
                ))}
              </div>
            </div>
            {name && table && (
              <div style={{textAlign:"center",animation:"slideIn .3s ease"}}>
                <p style={{color:"rgba(255,255,255,0.55)",marginBottom:14,fontSize:".9rem"}}>
                  Hola <strong style={{color:"#ff88ff"}}>{name}</strong> · Mesa <strong style={{color:"#ff88ff"}}>{table}</strong>
                </p>
                <button className="btn btn-p" onClick={() => setView("request")}>🎵 Pedir una canción</button>
              </div>
            )}
          </div>
        )}

        {/* ══ REQUEST ══ */}
        {view==="request" && (
          <div style={{animation:"slideIn .3s ease"}}>
            {(!name || !table) && (
              <div className="card-yellow" style={{textAlign:"center",marginBottom:14}}>
                ⚠️ Primero ingresa tu nombre y mesa en <strong style={{color:"#ffcc00",cursor:"pointer"}} onClick={() => setView("home")}>Inicio</strong>
              </div>
            )}
            <div className="card" style={{marginBottom:14}}>
              <p style={{margin:"0 0 10px",fontWeight:"bold",color:"#ff88ff",fontSize:".9rem"}}>🔍 Busca tu canción:</p>
              <div style={{display:"flex",gap:8}}>
                <input className="inp" placeholder="Ej: Despacito, My Way, Thriller..." value={songQ}
                  onChange={e => setSongQ(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && doSearch()}
                  style={{flex:1}} />
                <button className="btn btn-p" style={{padding:"10px 16px",whiteSpace:"nowrap"}} onClick={doSearch}>🔍</button>
              </div>
              <p style={{color:"rgba(255,255,255,0.3)",fontSize:".75rem",margin:"8px 0 0"}}>Busca el nombre de la canción o artista</p>
            </div>

            {searching && (
              <div style={{textAlign:"center",padding:30}}>
                <div className="spin"/>
                <p style={{color:"rgba(255,255,255,0.45)",marginTop:12,fontSize:".85rem"}}>Buscando en YouTube...</p>
              </div>
            )}

            {ytFailed && (
              <div className="card" style={{textAlign:"center",padding:24,borderColor:"rgba(255,100,0,0.3)"}}>
                <div style={{fontSize:"2rem",marginBottom:8}}>⚠️</div>
                <p style={{color:"rgba(255,255,255,0.6)",fontSize:".85rem",marginBottom:14}}>No se pudo conectar.<br/>Intenta de nuevo.</p>
                <button className="btn btn-p" onClick={doSearch}>🔄 Reintentar</button>
              </div>
            )}

            {!searching && !ytFailed && ytResults.length > 0 && (
              <div style={{marginBottom:14}}>
                <p style={{color:"rgba(255,255,255,0.4)",fontSize:".8rem",marginBottom:10}}>
                  {pickedVideo ? "✅ Video seleccionado — puedes cambiarlo o enviar la solicitud:" : "Elige el video de karaoke que quieres cantar:"}
                </p>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                  {ytResults.map(v => (
                    <div key={v.id} className={`vcard ${pickedVideo?.id===v.id?"sel":""}`} onClick={() => setPickedVideo(v)}>
                      <img src={v.thumb} alt="" style={{width:80,height:45,borderRadius:8,objectFit:"cover",flexShrink:0}} onError={e=>e.target.style.display="none"}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:"bold",fontSize:".82rem",lineHeight:1.3,marginBottom:3,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{v.title}</div>
                        <div style={{color:"rgba(255,255,255,0.4)",fontSize:".72rem"}}>{v.author}</div>
                      </div>
                      {pickedVideo?.id===v.id ? <span style={{fontSize:"1.3rem",flexShrink:0}}>✅</span> : <span style={{fontSize:".75rem",color:"rgba(255,255,255,0.35)",flexShrink:0}}>Elegir</span>}
                    </div>
                  ))}
                </div>
                {pickedVideo && (
                  <div style={{textAlign:"center"}}>
                    <div className="card-green" style={{marginBottom:12,textAlign:"left"}}>
                      <p style={{margin:0,fontSize:".83rem",color:"rgba(255,255,255,0.7)"}}>🎬 <strong style={{color:"#00cc66"}}>{pickedVideo.title.slice(0,60)}{pickedVideo.title.length>60?"...":""}</strong></p>
                    </div>
                    <button className="btn btn-p" onClick={submitReq} style={{width:"100%"}}>🎤 Enviar solicitud al DJ</button>
                  </div>
                )}
              </div>
            )}

            {!searching && !ytFailed && ytResults.length === 0 && !songQ && (
              <div className="card" style={{textAlign:"center",padding:32,color:"rgba(255,255,255,0.35)"}}>
                <div style={{fontSize:"2.5rem",marginBottom:8}}>🎵</div>
                Escribe el nombre de una canción y presiona 🔍
              </div>
            )}
          </div>
        )}

        {/* ══ MY STATUS ══ */}
        {view==="mystatus" && (
          <div style={{animation:"slideIn .3s ease"}}>
            <h2 style={{margin:"0 0 16px",color:"#ff88ff",fontSize:"1.1rem"}}>📋 Mis solicitudes</h2>
            {myReqs.length === 0 ? (
              <div className="card" style={{textAlign:"center",padding:36}}>
                <div style={{fontSize:"2.5rem",marginBottom:10}}>🎵</div>
                <p style={{color:"rgba(255,255,255,0.45)"}}>No has pedido canciones todavía</p>
                <button className="btn btn-p" onClick={() => setView("request")} style={{marginTop:14}}>Pedir una canción</button>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[...myReqs].reverse().map((req,i) => {
                  const inPending = pending.some(p => p.videoId === req.videoId && p.singer === req.singer);
                  const inQueue = queue.some(q => q.videoId === req.videoId && q.singer === req.singer);
                  const isPlaying = currentSong?.videoId === req.videoId && currentSong?.singer === req.singer;
                  const status = isPlaying ? "playing" : inQueue ? "approved" : inPending ? "pending" : "done";
                  return (
                    <div key={i} className="card" style={{padding:"14px 18px"}}>
                      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                        <img src={req.thumb} alt="" style={{width:72,height:40,borderRadius:7,objectFit:"cover",flexShrink:0}} onError={e=>e.target.style.display="none"}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:"bold",fontSize:".88rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{req.title}</div>
                          <div style={{color:"rgba(255,255,255,0.45)",fontSize:".75rem",marginTop:3}}>{req.author}</div>
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{fontSize:".72rem",color:"rgba(255,255,255,0.4)"}}>Mesa {req.table}</span>
                        <span className={`badge ${status==="pending"?"badge-y":status==="approved"?"badge-g":status==="playing"?"badge-g":"badge-r"}`}>
                          {status==="pending"?"⏳ Pendiente":status==="approved"?"✅ En cola":status==="playing"?"🎤 Cantando ahora":"✅ Completada"}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <button className="btn btn-p" onClick={() => setView("request")} style={{marginTop:4}}>+ Pedir otra canción</button>
              </div>
            )}
          </div>
        )}

        {/* ══ QUEUE public ══ */}
        {view==="queue" && (
          <div style={{animation:"slideIn .3s ease"}}>
            <h2 style={{margin:"0 0 16px",color:"#ff88ff",fontSize:"1.1rem"}}>🎶 Cola de canciones</h2>
            {currentSong && (
              <div className="card-green" style={{marginBottom:14}}>
                <p style={{margin:"0 0 6px",fontSize:".72rem",color:"rgba(255,255,255,0.5)"}}><span className="live-dot"/>EN REPRODUCCIÓN EN TV</p>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <img src={currentSong.thumb} alt="" style={{width:64,height:36,borderRadius:7,objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
                  <div>
                    <div style={{fontWeight:"bold",fontSize:".9rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200}}>{currentSong.title}</div>
                    <div style={{color:"rgba(255,255,255,0.5)",fontSize:".78rem"}}>🎤 {currentSong.singer} · Mesa {currentSong.table}</div>
                  </div>
                </div>
              </div>
            )}
            {queue.length===0 ? (
              <div className="card" style={{textAlign:"center",padding:36}}>
                <div style={{fontSize:"2.5rem",marginBottom:10}}>🎵</div>
                <p style={{color:"rgba(255,255,255,0.45)"}}>Cola vacía — ¡pide tu canción!</p>
                <button className="btn btn-p" onClick={() => setView("request")} style={{marginTop:14}}>Pedir canción</button>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {queue.map((entry,i) => (
                  <div key={entry.fbKey} className="card" style={{padding:"12px 16px"}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <div style={{width:30,height:30,borderRadius:"50%",background:i===0?"linear-gradient(135deg,#ff00ff,#9900ff)":"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",fontSize:".82rem",flexShrink:0}}>{i+1}</div>
                      <img src={entry.thumb} alt="" style={{width:60,height:34,borderRadius:6,objectFit:"cover",flexShrink:0}} onError={e=>e.target.style.display="none"}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:"bold",fontSize:".85rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.title}</div>
                        <div style={{color:"rgba(255,255,255,0.45)",fontSize:".75rem"}}>🎤 {entry.singer} · Mesa {entry.table}</div>
                      </div>
                      {i===0 && <span className="badge badge-y">NEXT</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ ADMIN LOGIN ══ */}
        {view==="admin" && !adminOk && (
          <div style={{animation:"slideIn .3s ease"}}>
            <div className="card" style={{textAlign:"center",maxWidth:320,margin:"36px auto",padding:32}}>
              <div style={{fontSize:"2.8rem",marginBottom:10}}>🔐</div>
              <h2 style={{margin:"0 0 6px",color:"#ff88ff"}}>Acceso DJ</h2>
              <p style={{color:"rgba(255,255,255,0.45)",margin:"0 0 20px",fontSize:".85rem"}}>Panel exclusivo del DJ</p>
              <input className="inp" type="password" placeholder="Contraseña" value={adminPwd}
                onChange={e => { setAdminPwd(e.target.value); setAdminErr(false); }}
                onKeyDown={e => e.key==="Enter" && loginAdmin()}
                style={{marginBottom:10,textAlign:"center"}} />
              {adminErr && <p style={{color:"#ff5555",fontSize:".82rem",margin:"0 0 10px"}}>❌ Contraseña incorrecta</p>}
              <button className="btn btn-p" style={{width:"100%"}} onClick={loginAdmin}>🎛️ Entrar</button>
            </div>
          </div>
        )}

        {/* ══ ADMIN PANEL ══ */}
        {view==="admin" && adminOk && (
          <div style={{animation:"slideIn .3s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <h2 style={{margin:0,color:"#ff88ff",fontSize:"1.1rem"}}>🎛️ Panel DJ</h2>
              <button className="btn-r" onClick={() => { setAdminOk(false); setView("home"); }} style={{fontSize:".78rem"}}>🔒 Salir</button>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
              {[
                {k:"pending", label:`⚠️ Pendientes (${pending.length})`},
                {k:"queue",   label:`📋 Cola (${queue.length})`},
                {k:"now",     label:"🎬 En vivo"},
              ].map(({k,label}) => (
                <button key={k} className={`tab ${djTab===k?"on":""}`} onClick={() => setDjTab(k)}>{label}</button>
              ))}
            </div>

            {/* PENDING */}
            {djTab==="pending" && (
              pending.length===0 ?
              <div className="card" style={{textAlign:"center",padding:36}}>
                <div style={{fontSize:"2.5rem",marginBottom:10}}>✅</div>
                <p style={{color:"rgba(255,255,255,0.45)"}}>Sin solicitudes pendientes</p>
              </div> :
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {pending.map(req => (
                  <div key={req.fbKey} className="card" style={{padding:"14px 16px"}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                      <img src={req.thumb} alt="" style={{width:90,height:50,borderRadius:8,objectFit:"cover",flexShrink:0}} onError={e=>e.target.style.display="none"}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:"bold",fontSize:".88rem",lineHeight:1.3,marginBottom:4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{req.title}</div>
                        <div style={{color:"rgba(255,255,255,0.45)",fontSize:".76rem"}}>{req.author}</div>
                        <div style={{color:"rgba(255,255,255,0.6)",fontSize:".78rem",marginTop:4}}>🎤 <strong style={{color:"#ff88ff"}}>{req.singer}</strong> · Mesa {req.table}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button className="btn btn-g" style={{flex:1}} onClick={() => approve(req)}>✅ Aprobar</button>
                      <button className="btn-r" style={{flex:1,textAlign:"center"}} onClick={() => reject(req)}>❌ Rechazar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* QUEUE */}
            {djTab==="queue" && (
              queue.length===0 ?
              <div className="card" style={{textAlign:"center",padding:36}}>
                <div style={{fontSize:"2.5rem",marginBottom:10}}>🎵</div>
                <p style={{color:"rgba(255,255,255,0.45)"}}>Cola vacía</p>
              </div> :
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {queue.map((entry,i) => (
                  <div key={entry.fbKey} className="card" style={{padding:"14px 16px"}}>
                    <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                      <img src={entry.thumb} alt="" style={{width:80,height:45,borderRadius:7,objectFit:"cover",flexShrink:0}} onError={e=>e.target.style.display="none"}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:"bold",fontSize:".88rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.title}</div>
                        <div style={{color:"rgba(255,255,255,0.45)",fontSize:".76rem"}}>{entry.author}</div>
                        <div style={{color:"rgba(255,255,255,0.55)",fontSize:".78rem",marginTop:3}}>🎤 {entry.singer} · Mesa {entry.table}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {i===0 && <button className="btn btn-g" style={{flex:1}} onClick={() => playSong(entry)}>▶ Play en TV</button>}
                      <button className="btn-r" onClick={() => removeQ(entry)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* NOW PLAYING */}
            {djTab==="now" && (
              !currentSong ?
              <div className="card" style={{textAlign:"center",padding:36}}>
                <div style={{fontSize:"2.5rem",marginBottom:10}}>🎬</div>
                <p style={{color:"rgba(255,255,255,0.45)"}}>Ninguna canción en reproducción</p>
                <p style={{color:"rgba(255,255,255,0.3)",fontSize:".82rem",marginTop:6}}>Aprueba solicitudes y dale ▶ Play desde la Cola</p>
              </div> :
              <div>
                <div className="card-green" style={{marginBottom:14,textAlign:"center"}}>
                  <p style={{margin:"0 0 4px",fontSize:".72rem",color:"rgba(255,255,255,0.5)"}}><span className="live-dot"/>EN VIVO EN LA TV</p>
                  <div style={{fontWeight:"bold",fontSize:"1rem",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentSong.title}</div>
                  <div style={{color:"rgba(255,255,255,0.55)",fontSize:".82rem",marginBottom:12}}>🎤 {currentSong.singer} · Mesa {currentSong.table}</div>
                  <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                    <button className="btn-r" onClick={stopSong}>⏹ Detener</button>
                    {queue.length>0 && <button className="btn btn-g" onClick={() => playSong(queue[0])}>⏭ Siguiente</button>}
                  </div>
                </div>
                <p style={{color:"rgba(255,255,255,0.4)",fontSize:".8rem",textAlign:"center"}}>
                  📺 El video está reproduciéndose en la TV
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
