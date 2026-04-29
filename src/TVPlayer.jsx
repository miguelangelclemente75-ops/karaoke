import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function loadYoutubeIframeAPI() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        if (typeof prev === "function") prev();
      } catch (e) {
        /* ignore */
      }
      if (window.YT && window.YT.Player) resolve();
    };

    const start = Date.now();
    const iv = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(iv);
        resolve();
      } else if (Date.now() - start > 20000) {
        clearInterval(iv);
        reject(new Error("YouTube iframe API timeout"));
      }
    }, 50);
  });
}

/**
 * Fire TV / Silk: YT.Player sobre un <div> vacío suele dejar el vídeo en negro.
 * Aquí el iframe tiene src real (embed) y el API solo se engancha después del load.
 * mute=1 + unMute() en onReady cumple políticas de autoplay en muchos TV browsers.
 */
const YT_PS = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

/** En Fire TV el audio arranca antes que PLAYING/BUFFERING; si no, el cartel tapa el vídeo. */
const OVERLAY_EARLY_HIDE_MS = 500;

function embedSrcFor(videoId) {
  if (!videoId) return "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const p = new URLSearchParams({
    enablejsapi: "1",
    autoplay: "1",
    mute: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",
  });
  if (origin) p.set("origin", origin);
  return `https://www.youtube.com/embed/${videoId}?${p}`;
}

function isLikelySilkOrFireTvBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /\bSilk\b|AmazonWeb|AFT[A-Z][A-Za-z0-9]*|Fire ?TV/i.test(ua);
}

export default function TVPlayer({ song, nextSong, onSongEnded }) {
  const ytRef = useRef(null);
  const pollRef = useRef(null);
  const onSongEndedRef = useRef(onSongEnded);
  const loadFallbackTimerRef = useRef(null);
  const earlyOverlayTimerRef = useRef(null);
  const playRetryTimersRef = useRef([]);
  const playerRef = useRef(null);
  const cancelledRef = useRef(false);
  const currentVideoIdRef = useRef(song?.videoId);
  onSongEndedRef.current = onSongEnded;

  const endedSentRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [recoverTick, setRecoverTick] = useState(0);

  const bumpRecover = useCallback(() => {
    setRecoverTick((n) => n + 1);
  }, []);

  const iframeId = useMemo(
    () => `karaoke-yt-${song?.videoId}-${recoverTick}`,
    [song?.videoId, recoverTick]
  );

  const embedSrc = useMemo(
    () => embedSrcFor(song?.videoId),
    [song?.videoId]
  );

  const clearPlayRetries = useCallback(() => {
    playRetryTimersRef.current.forEach((t) => clearTimeout(t));
    playRetryTimersRef.current = [];
  }, []);

  const schedulePlayRetries = useCallback(
    (target) => {
      clearPlayRetries();
      const tryPlay = () => {
        if (cancelledRef.current || !target) return;
        try {
          if (typeof target.unMute === "function") target.unMute();
          target.playVideo();
        } catch (e) {
          /* ignore */
        }
      };
      [200, 600, 1400, 2800].forEach((ms) => {
        playRetryTimersRef.current.push(
          setTimeout(() => {
            if (cancelledRef.current) return;
            try {
              const st =
                typeof target.getPlayerState === "function"
                  ? target.getPlayerState()
                  : -1;
              if (st !== YT_PS.PLAYING && st !== YT_PS.BUFFERING) {
                tryPlay();
              }
            } catch (e) {
              tryPlay();
            }
          }, ms)
        );
      });
    },
    [clearPlayRetries]
  );

  const cleanupPlayer = useCallback(() => {
    clearPlayRetries();
    if (earlyOverlayTimerRef.current) {
      clearTimeout(earlyOverlayTimerRef.current);
      earlyOverlayTimerRef.current = null;
    }
    if (loadFallbackTimerRef.current) {
      clearTimeout(loadFallbackTimerRef.current);
      loadFallbackTimerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    const pl = playerRef.current;
    playerRef.current = null;
    ytRef.current = null;
    if (pl) {
      try {
        pl.destroy();
      } catch (e) {
        /* ignore */
      }
    }
  }, [clearPlayRetries]);

  useEffect(() => {
    currentVideoIdRef.current = song?.videoId;
  }, [song?.videoId]);

  useEffect(() => {
    if (!song?.videoId) return;

    cancelledRef.current = false;
    endedSentRef.current = false;
    setLoading(true);

    return () => {
      cancelledRef.current = true;
      cleanupPlayer();
    };
  }, [song?.videoId, recoverTick, cleanupPlayer]);

  const onIframeLoad = useCallback(async () => {
    const videoIdWhenLoad = song?.videoId;
    if (cancelledRef.current || !videoIdWhenLoad) return;

    cleanupPlayer();

    try {
      await loadYoutubeIframeAPI();
    } catch (e) {
      if (!cancelledRef.current) setLoading(false);
      return;
    }
    if (
      cancelledRef.current ||
      videoIdWhenLoad !== currentVideoIdRef.current
    ) {
      return;
    }

    const notifyEndLocal = () => {
      if (endedSentRef.current || cancelledRef.current) return;
      endedSentRef.current = true;
      try {
        onSongEndedRef.current?.();
      } catch (e) {
        /* ignore */
      }
    };

    try {
      const pl = new window.YT.Player(iframeId, {
        events: {
          onReady: (ev) => {
            if (cancelledRef.current) return;
            playerRef.current = ev.target;
            ytRef.current = ev.target;
            try {
              if (typeof ev.target.unMute === "function") ev.target.unMute();
              ev.target.playVideo();
            } catch (e) {
              /* ignore */
            }
            schedulePlayRetries(ev.target);
            if (earlyOverlayTimerRef.current) {
              clearTimeout(earlyOverlayTimerRef.current);
            }
            earlyOverlayTimerRef.current = setTimeout(() => {
              earlyOverlayTimerRef.current = null;
              if (!cancelledRef.current) setLoading(false);
            }, OVERLAY_EARLY_HIDE_MS);
            if (loadFallbackTimerRef.current) {
              clearTimeout(loadFallbackTimerRef.current);
            }
            loadFallbackTimerRef.current = setTimeout(() => {
              if (cancelledRef.current) return;
              setLoading(false);
            }, 9000);
          },
          onStateChange: (ev) => {
            if (cancelledRef.current) return;
            if (ev.data === YT_PS.PLAYING || ev.data === YT_PS.BUFFERING) {
              if (earlyOverlayTimerRef.current) {
                clearTimeout(earlyOverlayTimerRef.current);
                earlyOverlayTimerRef.current = null;
              }
              if (loadFallbackTimerRef.current) {
                clearTimeout(loadFallbackTimerRef.current);
                loadFallbackTimerRef.current = null;
              }
              setLoading(false);
            }
            if (ev.data === YT_PS.ENDED) notifyEndLocal();
          },
          onError: () => {
            if (cancelledRef.current) return;
            setLoading(true);
            bumpRecover();
          },
        },
      });
      playerRef.current = pl;

      pollRef.current = setInterval(() => {
        try {
          const p = ytRef.current;
          if (!p || typeof p.getPlayerState !== "function") return;
          if (p.getPlayerState() === YT_PS.ENDED) notifyEndLocal();
        } catch (e) {
          if (!cancelledRef.current) {
            setLoading(true);
            bumpRecover();
          }
        }
      }, 2500);
    } catch (e) {
      if (!cancelledRef.current) bumpRecover();
    }
  }, [
    iframeId,
    song?.videoId,
    bumpRecover,
    schedulePlayRetries,
    cleanupPlayer,
  ]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      try {
        const p = ytRef.current;
        if (p && typeof p.getPlayerState === "function") p.getPlayerState();
      } catch (e) {
        setLoading(true);
        bumpRecover();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [bumpRecover]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#000",
      }}
    >
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            background: "linear-gradient(135deg,#080018,#150030,#080018)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Georgia,serif",
          }}
        >
          <style>{`
            @keyframes tvShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
            @keyframes tvDot{0%,80%,100%{transform:scale(0);opacity:0}40%{transform:scale(1);opacity:1}}
          `}</style>
          <div
            style={{
              fontSize: "clamp(3rem,8vw,6rem)",
              marginBottom: 16,
              background:
                "linear-gradient(90deg,#ff00ff,#00ffff,#ffcc00,#ff00ff)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "tvShimmer 3s linear infinite",
              letterSpacing: 8,
              fontWeight: "bold",
            }}
          >
            HURRICANE
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "clamp(.8rem,2vw,1.2rem)",
              letterSpacing: 4,
              marginBottom: 48,
            }}
          >
            KARAOKE NIGHT
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,0,255,0.2)",
              borderRadius: 20,
              padding: "24px 48px",
              textAlign: "center",
              marginBottom: 48,
              maxWidth: "80vw",
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: "clamp(.7rem,1.5vw,1rem)",
                letterSpacing: 3,
                marginBottom: 12,
              }}
            >
              NOW LOADING
            </div>
            <div
              style={{
                fontWeight: "bold",
                fontSize: "clamp(1.2rem,3vw,2rem)",
                color: "#fff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "70vw",
                marginBottom: 8,
              }}
            >
              {song.title}
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "clamp(.8rem,2vw,1.2rem)",
              }}
            >
              {song.singer} Table {song.table}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: i === 2 ? 16 : 10,
                  height: i === 2 ? 16 : 10,
                  borderRadius: "50%",
                  background: i === 2 ? "#ff00ff" : "rgba(255,0,255,0.3)",
                  animation: `tvDot 1.4s ease-in-out ${i * 0.16}s infinite`,
                }}
              />
            ))}
          </div>
          {nextSong && (
            <div
              style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: "clamp(.7rem,1.5vw,.95rem)",
                letterSpacing: 2,
              }}
            >
              UP NEXT: {nextSong.title} {nextSong.singer}
            </div>
          )}
          {isLikelySilkOrFireTvBrowser() && (
            <div
              style={{
                color: "rgba(255,200,100,0.55)",
                fontSize: "clamp(.65rem,1.4vw,.85rem)",
                textAlign: "center",
                maxWidth: "92vw",
                marginTop: 10,
                lineHeight: 1.4,
              }}
            >
              Fire TV (navegador Silk): menú ⋮ → <strong>Solicitar sitio de escritorio</strong> si el vídeo sale negro.
            </div>
          )}
        </div>
      )}
      <iframe
        key={`${song?.videoId}-${recoverTick}`}
        id={iframeId}
        title="YouTube Karaoke"
        src={embedSrc}
        onLoad={onIframeLoad}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: 0,
        }}
      />
    </div>
  );
}
