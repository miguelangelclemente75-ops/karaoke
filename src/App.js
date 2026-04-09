import { useState, useEffect, useRef } from "react";

const SONGS = [
  { id: 1,  title: "Bohemian Rhapsody",    artist: "Queen",           genre: "Rock",     duration: "5:55", emoji: "🎸", youtubeSearch: "Bohemian Rhapsody karaoke with lyrics" },
  { id: 2,  title: "My Way",               artist: "Frank Sinatra",   genre: "Clásicos", duration: "4:35", emoji: "🎩", youtubeSearch: "My Way Frank Sinatra karaoke with lyrics" },
  { id: 3,  title: "Despacito",            artist: "Luis Fonsi",      genre: "Reggaeton",duration: "3:47", emoji: "🌴", youtubeSearch: "Despacito karaoke con letra" },
  { id: 4,  title: "Don't Stop Believin'", artist: "Journey",         genre: "Rock",     duration: "4:11", emoji: "🎵", youtubeSearch: "Don't Stop Believin Journey karaoke with lyrics" },
  { id: 5,  title: "La Bamba",             artist: "Ritchie Valens",  genre: "Latino",   duration: "2:10", emoji: "🎺", youtubeSearch: "La Bamba karaoke con letra" },
  { id: 6,  title: "Livin' on a Prayer",   artist: "Bon Jovi",        genre: "Rock",     duration: "4:09", emoji: "🤘", youtubeSearch: "Livin on a Prayer Bon Jovi karaoke with lyrics" },
  { id: 7,  title: "Shape of You",         artist: "Ed Sheeran",      genre: "Pop",      duration: "3:54", emoji: "🎤", youtubeSearch: "Shape of You Ed Sheeran karaoke with lyrics" },
  { id: 8,  title: "Cielito Lindo",        artist: "Tradicional",     genre: "Latino",   duration: "2:45", emoji: "🌹", youtubeSearch: "Cielito Lindo karaoke con letra" },
  { id: 9,  title: "Wonderwall",           artist: "Oasis",           genre: "Rock",     duration: "4:18", emoji: "🎸", youtubeSearch: "Wonderwall Oasis karaoke with lyrics" },
  { id: 10, title: "Bad Guy",              artist: "Billie Eilish",   genre: "Pop",      duration: "3:14", emoji: "😈", youtubeSearch: "Bad Guy Billie Eilish karaoke with lyrics" },
  { id: 11, title: "Tití Me Preguntó",     artist: "Bad Bunny",       genre: "Reggaeton",duration: "4:03", emoji: "🐰", youtubeSearch: "Titi Me Pregunto Bad Bunny karaoke con letra" },
  { id: 12, title: "Thriller",             artist: "Michael Jackson", genre: "Pop",      duration: "5:57", emoji: "👻", youtubeSearch: "Thriller Michael Jackson karaoke with lyrics" },
  { id: 13, title: "Sweet Caroline",       artist: "Neil Diamond",    genre: "Clásicos", duration: "3:23", emoji: "🌸", youtubeSearch: "Sweet Caroline Neil Diamond karaoke with lyrics" },
  { id: 14, title: "Gasolina",             artist: "Daddy Yankee",    genre: "Reggaeton",duration: "3:38", emoji: "🔥", youtubeSearch: "Gasolina Daddy Yankee karaoke con letra" },
  { id: 15, title: "Africa",               artist: "Toto",            genre: "Rock",     duration: "4:55", emoji: "🌍", youtubeSearch: "Africa Toto karaoke with lyrics" },
];

const GENRES = ["Todos", "Rock", "Pop", "Reggaeton", "Latino", "Clásicos"];
const TABLES = [1, 2, 3, 4, 5, 6, 7, 8];
const ADMIN_PASSWORD = "karaoke2024";

export default function KaraokeApp() {
  const [view, setView] = useState("home");
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState("Todos");
  const [search, setSearch] = useState("");
  const [queue, setQueue] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [singerName, setSingerName] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSong, setPendingSong] = useState(null);
  const [toast, setToast] = useState(null);
  const [adminView, setAdminView] = useState("queue");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminInput, setAdminInput] = useState("");
  const [adminError, setAdminError] = useState(false);
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [searchingYT, setSearchingYT] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [ytSearchInput, setYtSearchInput] = useState("");

  const notes = Array.from({ length: 8 }, (_, i) => ({
    left: `${10 + i * 12}%`, animationDelay: `${i * 0.7}s`,
    fontSize: `${1 + (i % 3) * 0.5}rem`, opacity: 0.15 + (i % 3) * 0.1,
  }));

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleAdminLogin = () => {
    if (adminInput === ADMIN_PASSWORD) { setAdminUnlocked(true); setAdminError(false); setAdminInput(""); }
    else { setAdminError(true); setAdminInput(""); }
  };

  const filteredSongs = SONGS.filter(s => {
    const matchGenre = selectedGenre === "Todos" || s.genre === selectedGenre;
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) || s.artist.toLowerCase().includes(search.toLowerCase());
    return matchGenre && matchSearch;
  });

  const requestSong = (song) => {
    if (!singerName.trim()) { showToast("¡Ingresa tu nombre primero!", "error"); return; }
    if (!selectedTable) { showToast("¡Selecciona tu mesa primero!", "error"); return; }
    setPendingSong(song); setShowConfirm(true);
  };

  const confirmRequest = () => {
    setQueue(q => [...q, { ...pendingSong, singer: singerName, table: selectedTable, id: Date.now() }]);
    showToast(`🎤 "${pendingSong.title}" agregada a la cola!`);
    setShowConfirm(false); setPendingSong(null);
  };

  const removeFromQueue = (id) => { setQueue(q => q.filter(i => i.id !== id)); showToast("Canción removida", "error"); };

  // Search YouTube via oembed / invidious proxy
  const searchYouTube = async (query) => {
    setSearchingYT(true);
    setYoutubeResults([]);
    try {
      const res = await fetch(`https://inv.tux.pizza/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,lengthSeconds`);
      const data = await res.json();
      const videos = (data || []).slice(0, 6).map(v => ({
        id: v.videoId,
        title: v.title,
        author: v.author,
        duration: formatDuration(v.lengthSeconds),
        thumb: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
      }));
      setYoutubeResults(videos);
    } catch(e) {
      // fallback: open YouTube search in new tab
      showToast("Abriendo búsqueda en YouTube...", "success");
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, "_blank");
    }
    setSearchingYT(false);
  };

  const formatDuration = (secs) => {
    if (!secs) return "--:--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2,"0")}`;
  };

  const startSong = (entry) => {
    setCurrentSong(entry);
    setQueue(q => q.filter(i => i.id !== entry.id));
    setSelectedVideoId(null);
    setYoutubeResults([]);
    setShowPlayer(false);
    setAdminView("now");
    setYtSearchInput(entry.youtubeSearch || `${entry.title} ${entry.artist} karaoke`);
    // auto search
    searchYouTube(entry.youtubeSearch || `${entry.title} ${entry.artist} karaoke`);
  };

  const playVideo = (videoId) => {
    setSelectedVideoId(videoId);
    setShowPlayer(true);
  };

  const stopVideo = () => {
    setSelectedVideoId(null);
    setShowPlayer(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0a0015 0%,#1a0030 40%,#0d001a 100%)", fontFamily:"'Georgia',serif", color:"#fff", position:"relative", overflow:"hidden" }}>
      <style>{`
        @keyframes floatNote{0%{transform:translateY(100vh) rotate(0deg);opacity:0}10%{opacity:0.2}90%{opacity:0.1}100%{transform:translateY(-100px) rotate(360deg);opacity:0}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes toastIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .floating-note{position:fixed;color:#ff00ff;animation:floatNote 8s linear infinite;pointer-events:none;z-index:0}
        .song-card:hover{transform:translateY(-3px);border-color:#ff00ff!important;background:rgba(255,0,255,0.15)!important}
        .song-card{transition:all 0.2s ease;cursor:pointer}
        .video-card:hover{border-color:#ff00ff!important;background:rgba(255,0,255,0.1)!important;transform:translateY(-2px)}
        .video-card{transition:all 0.2s ease;cursor:pointer}
        .btn-primary{background:linear-gradient(135deg,#ff00ff,#9900ff);border:none;color:white;padding:12px 28px;border-radius:50px;font-size:1rem;cursor:pointer;font-family:Georgia,serif;font-weight:bold;letter-spacing:1px;transition:all 0.2s}
        .btn-primary:hover{transform:scale(1.05);box-shadow:0 0 20px rgba(255,0,255,0.5)}
        .btn-green{background:linear-gradient(135deg,#00cc66,#009944);border:none;color:white;padding:10px 20px;border-radius:50px;font-size:0.9rem;cursor:pointer;font-family:Georgia,serif;font-weight:bold;transition:all 0.2s}
        .btn-green:hover{transform:scale(1.05);box-shadow:0 0 15px rgba(0,200,100,0.4)}
        .tab-btn{background:transparent;border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.6);padding:8px 20px;border-radius:50px;cursor:pointer;font-family:Georgia,serif;transition:all 0.2s}
        .tab-btn.active{background:linear-gradient(135deg,#ff00ff,#9900ff);color:white;border-color:transparent}
        .genre-chip{padding:6px 16px;border-radius:50px;border:1px solid rgba(255,0,255,0.4);background:transparent;color:rgba(255,255,255,0.7);cursor:pointer;font-family:Georgia,serif;font-size:0.85rem;transition:all 0.2s}
        .genre-chip.active{background:rgba(255,0,255,0.3);color:#ff88ff;border-color:#ff00ff}
        .input-field{background:rgba(255,255,255,0.05);border:1px solid rgba(255,0,255,0.3);color:white;padding:10px 16px;border-radius:12px;font-family:Georgia,serif;font-size:1rem;outline:none;width:100%;box-sizing:border-box}
        .input-field:focus{border-color:#ff00ff;box-shadow:0 0 10px rgba(255,0,255,0.2)}
        .input-field::placeholder{color:rgba(255,255,255,0.3)}
        .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:24px;animation:slideIn 0.3s ease}
        .glow-text{background:linear-gradient(90deg,#ff00ff,#00ffff,#ff00ff);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 3s linear infinite}
        .spinner{width:32px;height:32px;border:3px solid rgba(255,0,255,0.2);border-top-color:#ff00ff;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto}
        .yt-iframe-wrap{position:relative;width:100%;padding-bottom:56.25%;border-radius:16px;overflow:hidden;background:#000}
        .yt-iframe-wrap iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}
      `}</style>

      {notes.map((n,i) => <div key={i} className="floating-note" style={{left:n.left,animationDelay:n.animationDelay,fontSize:n.fontSize,opacity:n.opacity}}>♪</div>)}

      {toast && <div style={{position:"fixed",top:20,right:20,zIndex:1000,background:toast.type==="error"?"rgba(255,50,50,0.9)":"rgba(50,200,100,0.9)",padding:"12px 24px",borderRadius:16,fontWeight:"bold",animation:"toastIn 0.3s ease"}}>{toast.msg}</div>}

      {/* FULLSCREEN PLAYER */}
      {showPlayer && selectedVideoId && (
        <div style={{position:"fixed",inset:0,background:"#000",zIndex:2000,display:"flex",flexDirection:"column"}}>
          <div style={{position:"absolute",top:16,right:16,zIndex:2001,display:"flex",gap:10}}>
            <button onClick={stopVideo} style={{background:"rgba(255,50,50,0.9)",border:"none",color:"white",padding:"10px 20px",borderRadius:50,cursor:"pointer",fontFamily:"Georgia",fontWeight:"bold",fontSize:"1rem"}}>✕ Cerrar</button>
          </div>
          <iframe
            style={{width:"100%",height:"100%",border:"none"}}
            src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1&rel=0&modestbranding=1`}
            allow="autoplay; fullscreen"
            allowFullScreen
            title="Karaoke Player"
          />
        </div>
      )}

      {showConfirm && pendingSong && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}}>
          <div className="card" style={{maxWidth:380,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:"3rem",marginBottom:12}}>{pendingSong.emoji}</div>
            <h2 style={{margin:"0 0 8px",color:"#ff88ff"}}>Confirmar solicitud</h2>
            <p style={{color:"rgba(255,255,255,0.7)",margin:"0 0 20px"}}><strong style={{color:"#fff"}}>{pendingSong.title}</strong><br/>{pendingSong.artist} • Mesa {selectedTable}</p>
            <p style={{margin:"0 0 20px",color:"rgba(255,255,255,0.6)"}}>Cantante: <strong style={{color:"#ff88ff"}}>{singerName}</strong></p>
            <div style={{display:"flex",gap:12,justifyContent:"center"}}>
              <button className="btn-primary" onClick={confirmRequest}>✅ Confirmar</button>
              <button onClick={() => setShowConfirm(false)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"white",padding:"12px 24px",borderRadius:50,cursor:"pointer",fontFamily:"Georgia"}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{textAlign:"center",padding:"30px 20px 20px",borderBottom:"1px solid rgba(255,0,255,0.15)",position:"relative",zIndex:10}}>
        <h1 className="glow-text" style={{fontSize:"2.2rem",margin:0,letterSpacing:3}}>🎤 KARAOKE NIGHT</h1>
        <p style={{color:"rgba(255,255,255,0.4)",margin:"4px 0 16px",letterSpacing:2,fontSize:"0.8rem"}}>SISTEMA DE SOLICITUDES</p>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          {["home","songs","queue","admin"].map(v => (
            <button key={v} className={`tab-btn ${view===v?"active":""}`} onClick={() => setView(v)}>
              {v==="home"?"🏠 Inicio":v==="songs"?"🎵 Canciones":v==="queue"?`📋 Cola (${queue.length})`:"🔐 DJ"}
            </button>
          ))}
        </div>
      </div>

      <div style={{position:"relative",zIndex:10,padding:"24px 16px",maxWidth:700,margin:"0 auto"}}>

        {/* HOME */}
        {view==="home" && (
          <div style={{animation:"slideIn 0.3s ease"}}>
            <div className="card" style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:"4rem",marginBottom:12}}>🎶</div>
              <h2 style={{margin:"0 0 8px",fontSize:"1.5rem"}}>¡Bienvenido!</h2>
              <p style={{color:"rgba(255,255,255,0.6)",margin:"0 0 24px"}}>Selecciona tu mesa y pide tu canción favorita</p>
              <div style={{marginBottom:20}}>
                <p style={{margin:"0 0 12px",fontWeight:"bold",color:"#ff88ff"}}>Tu nombre:</p>
                <input className="input-field" placeholder="¿Cómo te llamas?" value={singerName} onChange={e => setSingerName(e.target.value)} style={{maxWidth:300,margin:"0 auto",display:"block"}} />
              </div>
              <p style={{margin:"0 0 12px",fontWeight:"bold",color:"#ff88ff"}}>Selecciona tu mesa:</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>
                {TABLES.map(t => (
                  <button key={t} onClick={() => setSelectedTable(t)} style={{width:52,height:52,borderRadius:14,border:selectedTable===t?"2px solid #ff00ff":"1px solid rgba(255,255,255,0.2)",background:selectedTable===t?"rgba(255,0,255,0.25)":"rgba(255,255,255,0.05)",color:selectedTable===t?"#ff88ff":"rgba(255,255,255,0.7)",cursor:"pointer",fontWeight:"bold",fontSize:"1rem",transition:"all 0.2s"}}>{t}</button>
                ))}
              </div>
            </div>
            {selectedTable && singerName && (
              <div style={{textAlign:"center",animation:"slideIn 0.3s ease"}}>
                <p style={{color:"rgba(255,255,255,0.6)",marginBottom:16}}>¡Listo, <strong style={{color:"#ff88ff"}}>{singerName}</strong>! Mesa <strong style={{color:"#ff88ff"}}>{selectedTable}</strong>.</p>
                <button className="btn-primary" onClick={() => setView("songs")}>🎵 Ver Canciones</button>
              </div>
            )}
          </div>
        )}

        {/* SONGS */}
        {view==="songs" && (
          <div style={{animation:"slideIn 0.3s ease"}}>
            {!selectedTable && <div className="card" style={{textAlign:"center",marginBottom:16,borderColor:"rgba(255,150,0,0.4)"}}>⚠️ Selecciona tu mesa en <strong style={{color:"#ff88ff",cursor:"pointer"}} onClick={() => setView("home")}>Inicio</strong> primero</div>}
            <input className="input-field" placeholder="🔍 Buscar canción o artista..." value={search} onChange={e => setSearch(e.target.value)} style={{marginBottom:16}} />
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
              {GENRES.map(g => <button key={g} className={`genre-chip ${selectedGenre===g?"active":""}`} onClick={() => setSelectedGenre(g)}>{g}</button>)}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filteredSongs.map(song => (
                <div key={song.id} className="song-card card" style={{padding:"16px 20px"}} onClick={() => requestSong(song)}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <span style={{fontSize:"2rem"}}>{song.emoji}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:"bold",fontSize:"1rem",marginBottom:2}}>{song.title}</div>
                      <div style={{color:"rgba(255,255,255,0.5)",fontSize:"0.85rem"}}>{song.artist}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:"0.7rem",background:"rgba(255,0,255,0.2)",border:"1px solid rgba(255,0,255,0.3)",borderRadius:20,padding:"2px 10px",color:"#ff88ff",marginBottom:4}}>{song.genre}</div>
                      <div style={{fontSize:"0.75rem",color:"rgba(255,255,255,0.4)"}}>⏱ {song.duration}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QUEUE */}
        {view==="queue" && (
          <div style={{animation:"slideIn 0.3s ease"}}>
            <h2 style={{margin:"0 0 20px",color:"#ff88ff"}}>📋 Cola de canciones</h2>
            {queue.length===0 ? (
              <div className="card" style={{textAlign:"center",padding:40}}>
                <div style={{fontSize:"3rem",marginBottom:12}}>🎵</div>
                <p style={{color:"rgba(255,255,255,0.5)"}}>No hay canciones en cola todavía</p>
                <button className="btn-primary" onClick={() => setView("songs")} style={{marginTop:16}}>Pedir una canción</button>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {queue.map((entry,i) => (
                  <div key={entry.id} className="card" style={{padding:"16px 20px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:i===0?"linear-gradient(135deg,#ff00ff,#9900ff)":"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",flexShrink:0}}>{i+1}</div>
                      <span style={{fontSize:"1.5rem"}}>{entry.emoji}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:"bold"}}>{entry.title}</div>
                        <div style={{color:"rgba(255,255,255,0.5)",fontSize:"0.8rem"}}>🎤 {entry.singer} · Mesa {entry.table}</div>
                      </div>
                      {i===0 && <span style={{fontSize:"0.7rem",background:"rgba(255,200,0,0.2)",border:"1px solid rgba(255,200,0,0.4)",borderRadius:20,padding:"2px 10px",color:"#ffcc00"}}>NEXT</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADMIN LOGIN */}
        {view==="admin" && !adminUnlocked && (
          <div style={{animation:"slideIn 0.3s ease"}}>
            <div className="card" style={{textAlign:"center",maxWidth:340,margin:"40px auto",padding:36}}>
              <div style={{fontSize:"3rem",marginBottom:12}}>🔐</div>
              <h2 style={{margin:"0 0 8px",color:"#ff88ff"}}>Acceso DJ</h2>
              <p style={{color:"rgba(255,255,255,0.5)",margin:"0 0 24px",fontSize:"0.9rem"}}>Panel exclusivo para el DJ del restaurante</p>
              <input className="input-field" type="password" placeholder="Contraseña" value={adminInput}
                onChange={e => { setAdminInput(e.target.value); setAdminError(false); }}
                onKeyDown={e => e.key==="Enter" && handleAdminLogin()}
                style={{marginBottom:12,textAlign:"center"}} />
              {adminError && <p style={{color:"#ff6666",fontSize:"0.85rem",margin:"0 0 12px"}}>❌ Contraseña incorrecta</p>}
              <button className="btn-primary" style={{width:"100%"}} onClick={handleAdminLogin}>🎛️ Entrar al panel</button>
            </div>
          </div>
        )}

        {/* ADMIN PANEL */}
        {view==="admin" && adminUnlocked && (
          <div style={{animation:"slideIn 0.3s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,color:"#ff88ff"}}>🎛️ Panel del DJ</h2>
              <button onClick={() => { setAdminUnlocked(false); setView("home"); }} style={{background:"rgba(255,50,50,0.2)",border:"1px solid rgba(255,50,50,0.4)",color:"#ff8888",padding:"6px 14px",borderRadius:20,cursor:"pointer",fontFamily:"Georgia",fontSize:"0.8rem"}}>🔒 Salir</button>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              {["queue","now"].map(v => <button key={v} className={`tab-btn ${adminView===v?"active":""}`} onClick={() => setAdminView(v)}>{v==="queue"?`📋 Cola (${queue.length})`:"🎬 YouTube"}</button>)}
            </div>

            {/* QUEUE TAB */}
            {adminView==="queue" && (
              queue.length===0 ?
              <div className="card" style={{textAlign:"center",padding:40}}>
                <div style={{fontSize:"3rem",marginBottom:12}}>🎵</div>
                <p style={{color:"rgba(255,255,255,0.5)"}}>Cola vacía — esperando solicitudes</p>
              </div> :
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {queue.map((entry,i) => (
                  <div key={entry.id} className="card" style={{padding:"16px 20px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:"1.5rem"}}>{entry.emoji}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:"bold"}}>{entry.title}</div>
                        <div style={{color:"rgba(255,255,255,0.5)",fontSize:"0.8rem"}}>🎤 {entry.singer} · Mesa {entry.table} · {entry.duration}</div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        {i===0 && <button className="btn-green" onClick={() => startSong(entry)}>▶ Play + YouTube</button>}
                        <button onClick={() => removeFromQueue(entry.id)} style={{background:"rgba(255,50,50,0.2)",border:"1px solid rgba(255,50,50,0.4)",color:"#ff8888",padding:"8px 14px",borderRadius:20,cursor:"pointer",fontFamily:"Georgia"}}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* YOUTUBE TAB */}
            {adminView==="now" && (
              <div>
                {!currentSong ? (
                  <div className="card" style={{textAlign:"center",padding:40}}>
                    <div style={{fontSize:"3rem",marginBottom:12}}>🎬</div>
                    <p style={{color:"rgba(255,255,255,0.5)"}}>Dale ▶ Play a una canción de la cola primero</p>
                  </div>
                ) : (
                  <div>
                    {/* Now playing banner */}
                    <div className="card" style={{marginBottom:16,background:"rgba(0,200,100,0.08)",borderColor:"rgba(0,200,100,0.3)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <span style={{fontSize:"2rem"}}>{currentSong.emoji}</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:"bold",fontSize:"1.1rem"}}>{currentSong.title}</div>
                          <div style={{color:"rgba(255,255,255,0.5)",fontSize:"0.85rem"}}>🎤 {currentSong.singer} · Mesa {currentSong.table}</div>
                        </div>
                        {showPlayer && <span style={{fontSize:"0.75rem",background:"rgba(255,0,0,0.3)",border:"1px solid rgba(255,0,0,0.5)",borderRadius:20,padding:"3px 12px",color:"#ff8888"}}>● EN VIVO</span>}
                      </div>
                    </div>

                    {/* Video player */}
                    {showPlayer && selectedVideoId && (
                      <div style={{marginBottom:16}}>
                        <div className="yt-iframe-wrap">
                          <iframe
                            src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1&rel=0&modestbranding=1`}
                            allow="autoplay; fullscreen"
                            allowFullScreen
                            title="Karaoke"
                          />
                        </div>
                        <div style={{display:"flex",gap:10,marginTop:10,justifyContent:"center"}}>
                          <button onClick={stopVideo} style={{background:"rgba(255,50,50,0.2)",border:"1px solid rgba(255,50,50,0.4)",color:"#ff8888",padding:"8px 20px",borderRadius:20,cursor:"pointer",fontFamily:"Georgia"}}>⏹ Detener</button>
                          <button onClick={() => { stopVideo(); setAdminView("queue"); }} style={{background:"rgba(255,200,0,0.15)",border:"1px solid rgba(255,200,0,0.3)",color:"#ffcc00",padding:"8px 20px",borderRadius:20,cursor:"pointer",fontFamily:"Georgia"}}>⏭ Siguiente</button>
                        </div>
                      </div>
                    )}

                    {/* YouTube search */}
                    <div className="card" style={{marginBottom:16}}>
                      <p style={{margin:"0 0 10px",color:"#ff88ff",fontWeight:"bold",fontSize:"0.9rem"}}>🔍 Buscar karaoke en YouTube</p>
                      <div style={{display:"flex",gap:8}}>
                        <input className="input-field" placeholder="Buscar..." value={ytSearchInput}
                          onChange={e => setYtSearchInput(e.target.value)}
                          onKeyDown={e => e.key==="Enter" && searchYouTube(ytSearchInput)}
                          style={{flex:1}} />
                        <button className="btn-primary" style={{padding:"10px 18px",fontSize:"0.85rem",whiteSpace:"nowrap"}}
                          onClick={() => searchYouTube(ytSearchInput)}>🔍</button>
                      </div>
                    </div>

                    {/* Searching spinner */}
                    {searchingYT && (
                      <div style={{textAlign:"center",padding:30}}>
                        <div className="spinner" />
                        <p style={{color:"rgba(255,255,255,0.5)",marginTop:12,fontSize:"0.85rem"}}>Buscando en YouTube...</p>
                      </div>
                    )}

                    {/* Video results */}
                    {!searchingYT && youtubeResults.length > 0 && (
                      <div>
                        <p style={{color:"rgba(255,255,255,0.4)",fontSize:"0.8rem",marginBottom:10}}>Selecciona el video correcto:</p>
                        <div style={{display:"flex",flexDirection:"column",gap:10}}>
                          {youtubeResults.map(v => (
                            <div key={v.id} className="video-card card" style={{padding:"12px 16px",borderColor:"rgba(255,255,255,0.08)"}} onClick={() => playVideo(v.id)}>
                              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                                <img src={v.thumb} alt="" style={{width:80,height:45,borderRadius:8,objectFit:"cover",flexShrink:0}} />
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontWeight:"bold",fontSize:"0.85rem",lineHeight:1.3,marginBottom:4}}>{v.title}</div>
                                  <div style={{color:"rgba(255,255,255,0.4)",fontSize:"0.75rem"}}>{v.author} · {v.duration}</div>
                                </div>
                                <button className="btn-green" style={{padding:"6px 14px",fontSize:"0.8rem",whiteSpace:"nowrap"}}>▶ Play</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
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
