import { useCallback, useEffect, useRef, useState } from "react";

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
 * TV / Fire TV: un solo camino — YT.Player crea el iframe internamente.
 * Evita el bug de pantalla negra por iframe con src + YT.Player al mismo tiempo.
 */
const YT_PS = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

export default function TVPlayer({ song, nextSong, onSongEnded }) {
  const mountRef = useRef(null);
  const ytRef = useRef(null);
  const pollRef = useRef(null);
  const onSongEndedRef = useRef(onSongEnded);
  const loadFallbackTimerRef = useRef(null);
  const playRetryTimersRef = useRef([]);
  onSongEndedRef.current = onSongEnded;

  const endedSentRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [recoverTick, setRecoverTick] = useState(0);

  const bumpRecover = useCallback(() => {
    setRecoverTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!song?.videoId || !mountRef.current) return;

    let cancelled = false;
    let player = null;

    const clearPlayRetries = () => {
      playRetryTimersRef.current.forEach((t) => clearTimeout(t));
      playRetryTimersRef.current = [];
    };

    const schedulePlayRetries = (target) => {
      clearPlayRetries();
      const tryPlay = () => {
        if (cancelled || !target) return;
        try {
          target.playVideo();
        } catch (e) {
          /* ignore */
        }
      };
      [120, 450, 1000, 2200].forEach((ms) => {
        playRetryTimersRef.current.push(
          setTimeout(() => {
            if (cancelled) return;
            try {
              const st =
                typeof target.getPlayerState === "function"
                  ? target.getPlayerState()
                  : -1;
              if (st !== YT_PS.PLAYING && st !== YT_PS.BUFFERING) {
                tryPlay();
                if (
                  typeof target.loadVideoById === "function" &&
                  song?.videoId
                ) {
                  target.loadVideoById(song.videoId, 0);
                }
              }
            } catch (e) {
              tryPlay();
            }
          }, ms)
        );
      });
    };

    const cleanup = () => {
      clearPlayRetries();
      if (loadFallbackTimerRef.current) {
        clearTimeout(loadFallbackTimerRef.current);
        loadFallbackTimerRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (player) {
        try {
          player.destroy();
        } catch (e) {
          /* ignore */
        }
        player = null;
      }
      ytRef.current = null;
    };

    const notifyEnd = () => {
      if (endedSentRef.current || cancelled) return;
      endedSentRef.current = true;
      try {
        onSongEndedRef.current?.();
      } catch (e) {
        /* ignore */
      }
    };

    endedSentRef.current = false;
    setLoading(true);

    (async () => {
      try {
        await loadYoutubeIframeAPI();
      } catch (e) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (cancelled || !mountRef.current) return;

      cleanup();
      mountRef.current.innerHTML = "";

      await new Promise((r) => setTimeout(r, 120));

      if (cancelled || !mountRef.current) return;

      const origin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : undefined;

      try {
        player = new window.YT.Player(mountRef.current, {
          videoId: song.videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            ...(origin ? { origin } : {}),
          },
          events: {
            onReady: (ev) => {
              if (cancelled) return;
              ytRef.current = ev.target;
              try {
                ev.target.playVideo();
              } catch (e) {
                /* ignore */
              }
              schedulePlayRetries(ev.target);
              if (loadFallbackTimerRef.current)
                clearTimeout(loadFallbackTimerRef.current);
              loadFallbackTimerRef.current = setTimeout(() => {
                if (cancelled) return;
                setLoading(false);
              }, 9000);
            },
            onStateChange: (ev) => {
              if (cancelled) return;
              if (
                ev.data === YT_PS.PLAYING ||
                ev.data === YT_PS.BUFFERING
              ) {
                if (loadFallbackTimerRef.current) {
                  clearTimeout(loadFallbackTimerRef.current);
                  loadFallbackTimerRef.current = null;
                }
                setLoading(false);
              }
              if (ev.data === YT_PS.ENDED) notifyEnd();
            },
            onError: () => {
              if (cancelled) return;
              setLoading(true);
              bumpRecover();
            },
          },
        });
        if (!cancelled) {
          pollRef.current = setInterval(() => {
            try {
              const p = ytRef.current;
              if (!p || typeof p.getPlayerState !== "function") return;
              if (p.getPlayerState() === YT_PS.ENDED) notifyEnd();
            } catch (e) {
              if (!cancelled) {
                setLoading(true);
                bumpRecover();
              }
            }
          }, 2500);
        }
      } catch (e) {
        if (!cancelled) bumpRecover();
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [song?.videoId, recoverTick, bumpRecover]);

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
        </div>
      )}
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height: "100%",
          opacity: loading ? 0 : 1,
          transition: "opacity 0.35s ease",
        }}
      />
    </div>
  );
}
