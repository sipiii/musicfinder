import { useEffect, useRef, useState } from "react";

export default function Player({
  song,
  view,
  onPrev,
  onNext,
  onToggleFavorite,
  isFavorite,
  onDelete,
  resumeTime = 0,
  onClose,
  onSaveTime
}) {
  const playerRef = useRef(null);
  const playerObj = useRef(null);
  const fullscreenWrapperRef = useRef(null);
  const repeatRef = useRef(false);

  const userPausedRef = useRef(false);
  const allowSaveTimeRef = useRef(false);
  const iframeRef = useRef(null);

  const hideTimerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [repeat, setRepeat] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const [volume, setVolume] = useState(100);

  const [muted, setMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [showFsControls, setShowFsControls] = useState(true);

  // Fullscreen state sync (ESC / X / browser exit)
  useEffect(() => {
    const onFsChange = () => {
      const fs = Boolean(document.fullscreenElement);
      setIsFullscreen(fs);

      if (fs) {
        setShowFsControls(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setShowFsControls(false), 1500);
      } else {
        setShowFsControls(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleFullscreenToggle = () => {
    const el = fullscreenWrapperRef.current;
    if (!el) return;

    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
  };

  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  useEffect(() => {
    const forceFocus = () => {
      window.focus();
      document.body.focus();
    };
    window.addEventListener("click", forceFocus);
    return () => window.removeEventListener("click", forceFocus);
  }, []);

  // ✅ YT player init: NE függjön volume-tól, különben hangerőnél újrainit!
  useEffect(() => {
    if (!window.YT || !song) return;

    if (playerObj.current) {
      try {
        playerObj.current.destroy();
      } catch {}
      playerObj.current = null;
    }

    if (playerRef.current) {
      playerRef.current.innerHTML = "";
    }

    const newPlayer = new window.YT.Player(playerRef.current, {
      height: "100%",
      width: "100%",
      videoId: song.videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 0,
        fs: 0,
        rel: 0,
        showinfo: 0
      },
      events: {
        onReady: () => {
          const iframe = playerRef.current?.querySelector("iframe");
          if (iframe) {
            iframe.setAttribute("allow", "fullscreen");
            iframe.setAttribute("allowFullscreen", "true");
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.display = "block";
            iframeRef.current = iframe;
          }

          // kezdeti hangerő beállítás (csak onReady-ben)
          newPlayer.setVolume(volume);

          setTimeout(() => {
            if (resumeTime > 0) {
              newPlayer.seekTo(resumeTime, true);
              setCurrentTime(resumeTime);
            }
            newPlayer.playVideo();
            setIsPlaying(true);
            setDuration(newPlayer.getDuration());
          }, 300);
        },

        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.ENDED) {
            if (repeatRef.current) {
              newPlayer.seekTo(0, true);
              newPlayer.playVideo();
            } else {
              if (onNext) onNext();
            }
          }

          if (
            e.data === window.YT.PlayerState.PAUSED ||
            e.data === window.YT.PlayerState.ENDED
          ) {
            if (!userPausedRef.current && allowSaveTimeRef.current) {
              const time = newPlayer.getCurrentTime();
              if (onSaveTime) onSaveTime(time);
            }
            userPausedRef.current = false;
          }
        }
      }
    });

    playerObj.current = newPlayer;

    const interval = setInterval(() => {
      if (newPlayer.getPlayerState?.() === window.YT.PlayerState.PLAYING) {
        const time = newPlayer.getCurrentTime?.();
        if (typeof time === "number") setCurrentTime(time);
      }
    }, 100);

    return () => clearInterval(interval);
    // ✅ FONTOS: volume NINCS a dependencyben
  }, [song, resumeTime, onNext, onSaveTime]);

  // ✅ Hangerő állítás külön effectben (nem reinit)
  useEffect(() => {
    const p = playerObj.current;
    if (!p?.setVolume) return;

    p.setVolume(volume);

    if (volume === 0) {
      setMuted(true);
      p.mute?.();
    } else {
      if (muted) {
        setMuted(false);
        p.unMute?.();
      }
    }
  }, [volume]); // csak volume

  // fullscreenben az iframe is kitöltse
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.display = "block";
  }, [isFullscreen]);

  const togglePlay = () => {
    const p = playerObj.current;
    if (!p) return;

    if (isPlaying) {
      userPausedRef.current = true;
      p.pauseVideo();
      setIsPlaying(false);
    } else {
      p.playVideo();
      setIsPlaying(true);
    }
  };

  const handleNext = () => {
    if (!repeat) {
      allowSaveTimeRef.current = false;
      onNext();
    }
  };

  const handlePrev = () => {
    const p = playerObj.current;
    if (!p) return;

    if (repeat) {
      p.seekTo(0, true);
      setCurrentTime(0);
      return;
    }

    const t =
      typeof p.getCurrentTime === "function" ? Number(p.getCurrentTime()) : currentTime;

    if (Number.isFinite(t) && t < 3) {
      allowSaveTimeRef.current = false;
      if (onPrev) onPrev();
    } else {
      p.seekTo(0, true);
      setCurrentTime(0);
    }
  };

  const progressPercent = duration
    ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
    : 0;
  const progressRounded = Number(progressPercent.toFixed(2));

  const handleSeek = (e) => {
    const percent = Number(e.target.value);
    const p = playerObj.current;
    if (!p || duration === 0) return;

    const newTime = (percent / 100) * duration;

    p.seekTo(newTime, true);
    setCurrentTime(newTime);

    setTimeout(() => {
      const t = p.getCurrentTime?.();
      if (typeof t === "number") setCurrentTime(t);
    }, 150);

    if (allowSaveTimeRef.current && onSaveTime) onSaveTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const vol = Number(e.target.value);
    setVolume(vol);

    if (vol === 0) setMuted(true);
    if (vol > 0 && muted) setMuted(false);
  };

  const formatTime = (sec) => {
    const s = Math.floor(sec);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const leftVolumeIcon = muted ? "🔇" : "🔊";

  const videoContainerStyle = isFullscreen
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        borderRadius: 0,
        background: "#000",
        pointerEvents: "none"
      }
    : {
        position: "relative",
        display: "block",
        width: "100%",
        aspectRatio: "16 / 9",
        overflow: "hidden",
        borderRadius: "16px",
        background: "#000",
        pointerEvents: "none"
      };

  const Slider = ({ value, onChange }) => {
    return (
      <div style={sliderWrapStyle}>
        <div style={sliderTrackStyle}>
          <div style={{ ...sliderFillStyle, width: `${value}%` }} />
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={onChange}
          style={sliderInputStyle}
        />
      </div>
    );
  };

  const overlayStyle = isFullscreen
    ? {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        boxSizing: "border-box",
        padding: "14px 18px 14px",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        zIndex: 100000,
        opacity: showFsControls ? 1 : 0,
        pointerEvents: showFsControls ? "auto" : "none",
        transition: "opacity 0.22s ease"
      }
    : {
        width: "100%",
        boxSizing: "border-box",
        padding: "12px 12px 10px",
        background: "transparent",
        pointerEvents: "auto"
      };

  const handleVideoMouseMove = () => {
    if (!isFullscreen) return;

    setShowFsControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowFsControls(false), 1500);
  };

  return (
    <div
      ref={fullscreenWrapperRef}
      style={{
        ...styles.wrapper,
        ...(isFullscreen
          ? {
              width: "100vw",
              height: "100vh",
              position: "relative",
              margin: 0,
              padding: 0,
              display: "block"
            }
          : {})
      }}
      tabIndex={0}
      onClick={(e) => e.currentTarget.focus()}
      onMouseMove={handleVideoMouseMove}
    >
      <div
        style={videoContainerStyle}
        ref={playerRef}
        onClick={() => {
          const p = playerObj.current;
          if (p && p.playVideo) p.playVideo();
        }}
      />

      {/* X jobb felső sarok fullscreenben is */}
      <button
        className="close-btn"
        onClick={() => {
          if (isFullscreen) {
            exitFullscreen();
            return;
          }
          allowSaveTimeRef.current = true;
          if (onSaveTime) onSaveTime(currentTime);
          onClose(currentTime);
        }}
        style={{
          ...styles.closeButton,
          ...(isFullscreen
            ? {
                position: "fixed",
                top: "16px",
                right: "16px",
                zIndex: 100001,
                opacity: showFsControls ? 1 : 0,
                pointerEvents: showFsControls ? "auto" : "none",
                transition: "opacity 0.22s ease",
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(6px)"
              }
            : {})
        }}
      >
        ✕
      </button>

      <div style={overlayStyle}>
        <div style={styles.title}>{song.title}</div>

        <div style={styles.progressRow}>
          <span style={styles.time}>{formatTime(currentTime)}</span>
          <Slider value={progressRounded} onChange={handleSeek} />
          <span style={styles.time}>{formatTime(duration)}</span>
        </div>

        <div style={styles.controls}>
          <button
            className="control-btn favorite-btn"
            style={{
              ...styles.sideBtn,
              background: isFavorite
                ? "rgba(255, 64, 129, 0.35)"
                : "rgba(255,255,255,0.1)"
            }}
            onClick={onToggleFavorite}
          >
            {isFavorite ? "❤️" : "🤍"}
          </button>

          <button className="control-btn" style={styles.controlBtn} onClick={handlePrev}>
            ⏪
          </button>

          <button className="control-btn" style={styles.controlBtn} onClick={togglePlay}>
            {isPlaying ? "⏸️" : "▶️"}
          </button>

          <button className="control-btn" style={styles.controlBtn} onClick={handleNext}>
            ⏩
          </button>

          <button
            className="control-btn"
            style={{
              ...styles.controlBtn,
              background: repeat
                ? "rgba(29,185,84,0.35)"
                : "rgba(255,255,255,0.08)"
            }}
            onClick={() => {
              setRepeat((prev) => {
                const next = !prev;
                repeatRef.current = next;
                return next;
              });
            }}
          >
            🔄
          </button>

          <button
            className="control-btn delete-btn"
            style={{
              ...styles.sideBtn,
              background: "rgba(255, 0, 0, 0.25)",
              color: "white",
              border: "1px solid rgba(255,0,0,0.4)"
            }}
            onClick={() => {
              allowSaveTimeRef.current = false;
              if (onDelete) onDelete(song);
              if (onClose) onClose(0);
            }}
          >
            🗑️
          </button>

          <button className="control-btn" style={styles.controlBtn} onClick={handleFullscreenToggle}>
            ⛶
          </button>
        </div>

        <div style={styles.volumeRow}>
          <button
            className="control-btn"
            onClick={() => {
              const p = playerObj.current;

              if (!muted) {
                setLastVolume(volume);
                setVolume(0);
                p?.setVolume?.(0);
                p?.mute?.();
                setMuted(true);
              } else {
                setVolume(lastVolume);
                p?.setVolume?.(lastVolume);
                p?.unMute?.();
                setMuted(false);
              }
            }}
            style={{ ...styles.controlBtn, width: "40px", height: "40px", fontSize: "20px" }}
          >
            {leftVolumeIcon}
          </button>

          <Slider value={volume} onChange={handleVolumeChange} />
        </div>
      </div>
    </div>
  );
}

/* ====== Custom slider styles (stable fill) ====== */
const sliderWrapStyle = {
  position: "relative",
  flex: 1,
  height: "16px",
  display: "flex",
  alignItems: "center"
};

const sliderTrackStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  height: "6px",
  borderRadius: "4px",
  background: "#444",
  overflow: "hidden"
};

const sliderFillStyle = {
  height: "100%",
  background: "#1db954",
  borderRadius: "4px",
  transition: "width 0.08s linear"
};

const sliderInputStyle = {
  position: "relative",
  width: "100%",
  height: "16px",
  margin: 0,
  background: "transparent",
  appearance: "none",
  cursor: "pointer",
  outline: "none",
  zIndex: 2
};

const styles = {
  wrapper: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0px",
    color: "#fff",
    width: "100%"
  },

  title: {
    fontSize: "16px",
    fontWeight: "600",
    textAlign: "center",
    padding: "6px 10px 8px",
    color: "#fff",
    opacity: 0.9
  },

  progressRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "0 4px 10px"
  },

  time: {
    fontSize: "12px",
    color: "#ccc",
    minWidth: "40px",
    textAlign: "center"
  },

  controls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
    width: "100%",
    padding: "0 4px 10px",
    marginTop: "0px"
  },

  controlBtn: {
    padding: "0",
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    border: "none",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: "24px",
    cursor: "pointer",
    transition: "transform 0.1s ease, background 0.15s ease",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  sideBtn: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    border: "none",
    fontSize: "22px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
    transition: "transform 0.1s ease"
  },

  volumeRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "0 4px 0px"
  },

  closeButton: {
    position: "absolute",
    top: "10px",
    right: "10px",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "transparent",
    border: "2px solid rgba(255,255,255,0.3)",
    color: "#fff",
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10
  }
};
