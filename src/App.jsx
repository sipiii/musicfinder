import { useState, useEffect, useRef, useCallback } from "react";
import SongList from "./SongList";
import Player from "./Player";
import Login from "./Login";
import Register from "./Register";
import Profile from "./Profile";

const loadYouTubeAPI = () => {
  if (window.YT) return;
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
};
loadYouTubeAPI();

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authView, setAuthView] = useState("login");
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("loggedInUser");
    setAuthUser(savedUser || null);
    setLoadingAuth(false);
  }, []);

  const [lastSearchQuery, setLastSearchQuery] = useState("");

  // ========= ✅ USER-SCOPED STORAGE KEYS =========
  const userKey = useCallback(
    (base) => {
      const u = String(authUser || "").trim();
      if (!u) return null;
      return `${base}__${encodeURIComponent(u.toLowerCase())}`;
    },
    [authUser]
  );

  const readUserJson = useCallback(
    (base, fallback) => {
      const k = userKey(base);
      if (!k) return fallback;
      try {
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    [userKey]
  );

  const writeUserJson = useCallback(
    (base, value) => {
      const k = userKey(base);
      if (!k) return;
      try {
        localStorage.setItem(k, JSON.stringify(value));
      } catch {}
    },
    [userKey]
  );

  // migrate old global -> user on first login (optional but helpful)
  const migrateGlobalToUserOnce = useCallback(() => {
    if (!authUser) return;

    const songsK = userKey("songs");
    const favsK = userKey("favorites");
    const timesK = userKey("resumeTimes");

    try {
      if (songsK && !localStorage.getItem(songsK) && localStorage.getItem("songs")) {
        localStorage.setItem(songsK, localStorage.getItem("songs"));
        localStorage.removeItem("songs");
      }
      if (favsK && !localStorage.getItem(favsK) && localStorage.getItem("favorites")) {
        localStorage.setItem(favsK, localStorage.getItem("favorites"));
        localStorage.removeItem("favorites");
      }
      if (timesK && !localStorage.getItem(timesK) && localStorage.getItem("resumeTimes")) {
        localStorage.setItem(timesK, localStorage.getItem("resumeTimes"));
        localStorage.removeItem("resumeTimes");
      }
    } catch {}
  }, [authUser, userKey]);

  const [songs, setSongs] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [resumeTimes, setResumeTimes] = useState({});

  // ✅ when authUser changes -> load that user's data
  useEffect(() => {
    if (!authUser) {
      setSongs([]);
      setFavorites([]);
      setResumeTimes({});
      return;
    }

    migrateGlobalToUserOnce();

    const loadedSongs = readUserJson("songs", []);
    const loadedFavs = readUserJson("favorites", []);
    const loadedTimes = readUserJson("resumeTimes", {});

    setSongs(Array.isArray(loadedSongs) ? loadedSongs : []);
    setFavorites(Array.isArray(loadedFavs) ? loadedFavs : []);
    setResumeTimes(loadedTimes && typeof loadedTimes === "object" ? loadedTimes : {});
  }, [authUser, migrateGlobalToUserOnce, readUserJson]);

  // ✅ save per-user only
  useEffect(() => {
    if (!authUser) return;
    writeUserJson("songs", songs);
  }, [songs, authUser, writeUserJson]);

  useEffect(() => {
    if (!authUser) return;
    writeUserJson("favorites", favorites);
  }, [favorites, authUser, writeUserJson]);

  useEffect(() => {
    if (!authUser) return;
    writeUserJson("resumeTimes", resumeTimes);
  }, [resumeTimes, authUser, writeUserJson]);

  const [currentSong, setCurrentSong] = useState(null);
  const [view, setView] = useState(() => localStorage.getItem("currentView") || "home");
  const [menuOpen, setMenuOpen] = useState(() => {
    const saved = localStorage.getItem("menuOpen");
    return saved !== null ? saved === "true" : false;
  });
  const [showPlayer, setShowPlayer] = useState(true);

  const [noResults, setNoResults] = useState(false);

  const [lyricsSong, setLyricsSong] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const playerTimeRef = useRef(0);

  const [searchQueue, setSearchQueue] = useState([]);

  const API_KEY = "AIzaSyAzWHwzSTyefTiAqXAfBSD7XmyzmyBrNhU";

  useEffect(() => {
    const mapped = (searchResults || [])
      .filter((it) => it?.id?.videoId)
      .map((item) => {
        const videoId = item.id.videoId;
        return {
          id: `yt_${videoId}`,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          videoId,
          sourceType: "youtube",
          artwork: item.snippet.thumbnails?.default?.url,
          lyrics: null
        };
      });

    setSearchQueue(mapped);
  }, [searchResults]);

  const getAvatar = () => {
    const email = authUser;
    if (!email) return "";
    try {
      return localStorage.getItem(`profilePic_${email}`) || "";
    } catch {
      return "";
    }
  };

  const getMonogram = () => {
    if (!authUser) return "User";
    const name = String(authUser).split("@")[0] || "";
    const parts = name.split(/[._-]/).filter(Boolean);

    const first = (parts[0]?.[0] || name[0] || "").toUpperCase();
    const second = (parts[1]?.[0] || (name.length > 1 ? name[1] : "") || "").toUpperCase();

    const mon = (first + second).trim();
    return mon || "User";
  };

  const viewRef = useRef(view);
  const currentSongRef = useRef(currentSong);
  const songsRef = useRef(songs);
  const favoritesRef = useRef(favorites);
  const searchQueueRef = useRef(searchQueue);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  useEffect(() => {
    searchQueueRef.current = searchQueue;
  }, [searchQueue]);

  const goTo = useCallback((nextView) => {
    setView(nextView);
    localStorage.setItem("currentView", nextView);
    setMenuOpen(false);
    localStorage.setItem("menuOpen", "false");
  }, []);

  const toggleMenuFromLogo = useCallback(() => {
    setMenuOpen((prev) => {
      const next = !prev;
      localStorage.setItem("menuOpen", String(next));
      return next;
    });
  }, []);

  const saveCurrentTimeBeforeSwitch = useCallback(() => {
    const cs = currentSongRef.current;
    if (cs) {
      setResumeTimes((prev) => ({
        ...prev,
        [cs.id]: playerTimeRef.current
      }));
    }
  }, []);

  useEffect(() => {
    if (!currentSong || currentSong.lyrics !== undefined) return;

    const loadLyrics = async () => {
      let title = currentSong.title || "";
      let artist = currentSong.artist || "";

      if (title.includes(" - ")) {
        const parts = title.split(" - ");
        if (parts[0] && parts[1]) {
          artist = parts[0].trim();
          title = parts[1].trim();
        }
      }

      title = title
        .replace(/\s*\(.*?\)\s*/g, " ")
        .replace(/\s*\[.*?\]\s*/g, " ")
        .replace(/\s+(ft\.|feat\.?|ft|featuring).*/i, "")
        .replace(/\s+(with|by).*/i, "")
        .trim();

      artist = artist
        .replace(/VEVO/gi, "")
        .replace(/Official|Music|Topic|Channel/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!artist || !title) {
        setCurrentSong((prev) => ({
          ...prev,
          lyrics: "No lyrics available for this video."
        }));
        return;
      }

      const lyrics = await fetchLyrics(artist, title);

      setCurrentSong((prev) => ({
        ...prev,
        lyrics: lyrics || "No lyrics available for this video."
      }));

      setSongs((prev) =>
        prev.map((s) =>
          s.id === currentSong.id
            ? { ...s, lyrics: lyrics || "No lyrics available for this video." }
            : s
        )
      );
    };

    loadLyrics();
  }, [currentSong?.id]);

  const handlePrev = useCallback(() => {
    const v = viewRef.current;
    const cs = currentSongRef.current;

    if (v === "search" && searchQueueRef.current.length > 0 && cs) {
      const q = searchQueueRef.current;
      const idx = q.findIndex((s) => s.id === cs.id);
      if (idx !== -1) {
        const prevIdx = idx > 0 ? idx - 1 : q.length - 1;
        setCurrentSong(q[prevIdx]);
        setShowPlayer(true);
        return;
      }
    }

    if (v === "favorites") {
      const favs = favoritesRef.current;
      const favIndex = favs.findIndex((s) => s.id === cs?.id);
      if (favIndex > 0) setCurrentSong(favs[favIndex - 1]);
      else if (favIndex === 0 && favs.length > 0) setCurrentSong(favs[favs.length - 1]);
      setShowPlayer(true);
      return;
    }

    const list = songsRef.current;
    const currentIndex = list.findIndex((s) => s.id === cs?.id);

    if (currentIndex > 0) setCurrentSong(list[currentIndex - 1]);
    else if (currentIndex === 0 && list.length > 0) setCurrentSong(list[list.length - 1]);

    setShowPlayer(true);
  }, []);

  const handleNext = useCallback(() => {
    const v = viewRef.current;
    const cs = currentSongRef.current;

    if (v === "search" && searchQueueRef.current.length > 0 && cs) {
      const q = searchQueueRef.current;
      const idx = q.findIndex((s) => s.id === cs.id);
      if (idx !== -1) {
        const nextIdx = idx < q.length - 1 ? idx + 1 : 0;
        setCurrentSong(q[nextIdx]);
        setShowPlayer(true);
        return;
      }
    }

    if (v === "favorites") {
      const favs = favoritesRef.current;
      const favIndex = favs.findIndex((s) => s.id === cs?.id);
      if (favIndex < favs.length - 1) {
        setCurrentSong(favs[favIndex + 1]);
        setShowPlayer(true);
      } else if (favIndex === favs.length - 1 && favs.length > 0) {
        setCurrentSong(favs[0]);
        setShowPlayer(true);
      }
      return;
    }

    const list = songsRef.current;
    const currentIndex = list.findIndex((s) => s.id === cs?.id);

    if (currentIndex < list.length - 1) {
      setCurrentSong(list[currentIndex + 1]);
      setShowPlayer(true);
    } else if (currentIndex === list.length - 1 && list.length > 0) {
      setCurrentSong(list[0]);
      setShowPlayer(true);
    }
  }, []);

  const toggleFavorite = useCallback(
    (song) => {
      saveCurrentTimeBeforeSwitch();
      setFavorites((prev) => {
        const isFav = prev.some((s) => s.id === song.id);
        if (isFav) return prev.filter((s) => s.id !== song.id);
        return [...prev, song];
      });
    },
    [saveCurrentTimeBeforeSwitch]
  );

  const deleteSong = useCallback(
    (song) => {
      saveCurrentTimeBeforeSwitch();
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
      setResumeTimes((prev) => {
        const copy = { ...prev };
        delete copy[song.id];
        return copy;
      });
    },
    [saveCurrentTimeBeforeSwitch]
  );

  const deleteFavorite = useCallback(
    (song) => {
      saveCurrentTimeBeforeSwitch();
      setFavorites((prev) => prev.filter((s) => s.id !== song.id));
      setResumeTimes((prev) => {
        const copy = { ...prev };
        delete copy[song.id];
        return copy;
      });
    },
    [saveCurrentTimeBeforeSwitch]
  );

  const searchYouTube = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setLastSearchQuery(query);
    setSearchLoading(true);
    setSearchError(null);
    setNoResults(false);

    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(
          query
        )}&key=${API_KEY}`
      );
      const data = await res.json();

      if (data.error) {
        setSearchError("Error during YouTube search.");
        setSearchResults([]);
      } else {
        const items = data.items || [];
        setSearchResults(items);
        setNoResults(items.length === 0);
      }
    } catch {
      setSearchError("Network error during search.");
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchLyrics = async (artist, title) => {
    if (!artist?.trim() || !title?.trim()) return null;

    const origArtist = artist.trim();
    const origTitle = title.trim();

    try {
      const response = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(origArtist)}/${encodeURIComponent(origTitle)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.lyrics && data.lyrics.length > 50) return data.lyrics;
      }
    } catch {}

    try {
      const cleanArtist = origArtist.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ");
      const cleanTitle = origTitle.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ");

      if (cleanArtist && cleanTitle && (cleanArtist !== origArtist || cleanTitle !== origTitle)) {
        const response = await fetch(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data?.lyrics && data.lyrics.length > 50) return data.lyrics;
        }
      }
    } catch {}

    try {
      const response = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(origArtist)}/${encodeURIComponent(origTitle)}`,
        { method: "GET" }
      );
      if (response.status === 200) {
        const data = await response.json();
        if (data?.lyrics) return data.lyrics;
      }
    } catch {}

    return null;
  };

  const addYouTubeTrack = useCallback(
    (item) => {
      saveCurrentTimeBeforeSwitch();
      const videoId = item.id.videoId;

      const newSong = {
        id: `yt_${videoId}`,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        videoId,
        sourceType: "youtube",
        artwork: item.snippet.thumbnails?.default?.url,
        lyrics: null
      };

      setSongs((prevSongs) => {
        const exists = prevSongs.some((s) => s.id === newSong.id);
        if (exists) {
          const found = prevSongs.find((s) => s.id === newSong.id);
          setCurrentSong(found);
          return prevSongs;
        } else {
          const updated = [...prevSongs, newSong];
          setCurrentSong(newSong);
          return updated;
        }
      });

      setShowPlayer(true);
    },
    [saveCurrentTimeBeforeSwitch]
  );

  const handleLoginSuccess = () => {
    setAuthUser(localStorage.getItem("loggedInUser"));
    setView("home");
    localStorage.setItem("currentView", "home");
    setMenuOpen(false);
    localStorage.setItem("menuOpen", "false");
  };

  const handleRegisterSuccess = () => {
    setAuthUser(localStorage.getItem("loggedInUser"));
    setView("home");
    localStorage.setItem("currentView", "home");
    setMenuOpen(false);
    localStorage.setItem("menuOpen", "false");
  };

  const handleLogout = () => {
    setAuthUser(null);
    setAuthView("login");
    setView("home");
    localStorage.setItem("currentView", "home");
    setMenuOpen(false);
    localStorage.setItem("menuOpen", "false");

    // clear UI state so next user doesn't see old state while loading
    setCurrentSong(null);
    setShowPlayer(false);
  };

  const onPlayerDelete = useCallback(() => {
    const cs = currentSongRef.current;
    if (!cs) return;
    if (viewRef.current === "favorites") deleteFavorite(cs);
    else deleteSong(cs);
  }, [deleteFavorite, deleteSong]);

  const onPlayerSaveTime = useCallback((time) => {
    playerTimeRef.current = time;
    const cs = currentSongRef.current;
    if (!cs) return;
    setResumeTimes((prev) => ({
      ...prev,
      [cs.id]: time
    }));
  }, []);

  const onPlayerClose = useCallback((timeAtClose) => {
    const cs = currentSongRef.current;
    if (cs) {
      setResumeTimes((prev) => ({
        ...prev,
        [cs.id]: timeAtClose
      }));
    }
    setShowPlayer(false);
  }, []);

  if (loadingAuth) {
    return <div style={{ color: "#fff", padding: "20px" }}>Loading...</div>;
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "sans-serif",
        background: "linear-gradient(to bottom right, #000000, #1a1a1a, #2a2a2a)",
        color: "#fff",
        overflow: "hidden",
        position: "relative"
      }}
    >
      <style>{`
        .resp-ellipsis{
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .resp-shell{
          width:100%;
          height:100%;
          display:flex;
          position:relative;
          min-width:0;
        }
        .resp-sidebar{
          flex:0 0 220px;
          min-width:220px;
          max-width:220px;
        }
        .resp-content{
          flex:1;
          min-width:0;
        }
        .resp-page-padding{
          padding:20px;
        }
        .resp-player{
          width:420px;
        }

        @media (max-width: 900px){
          .resp-sidebar{
            flex:0 0 200px;
            min-width:200px;
            max-width:200px;
          }
          .resp-player{
            width:380px;
          }
          .resp-page-padding{
            padding:16px;
          }
        }

        @media (max-width: 700px){
          .resp-shell{
            flex-direction:column;
          }
          .resp-sidebar{
            width:100% !important;
            max-width:none !important;
            min-width:0 !important;
            flex:0 0 auto !important;
            border-right:none !important;
            padding:12px 10px !important;
            gap:12px !important;
          }
          .resp-sidebar-menu{
            padding-right:10px !important;
          }
          .resp-content{
            width:100%;
            height:auto;
            flex:1;
            min-height:0;
            padding-bottom: 320px !important;
          }
          .resp-page-padding{
            padding:12px !important;
          }

          .resp-player{
            position:fixed !important;
            left:50% !important;
            right:auto !important;
            bottom:10px !important;
            transform:translateX(-50%) !important;
            width:calc(100vw - 20px) !important;
            max-width:520px !important;
            padding:14px !important;
            border-radius:14px !important;
            z-index:15000 !important;
          }
        }

        @media (max-width: 420px){
          .resp-player{
            max-width:none !important;
            width:calc(100vw - 16px) !important;
            bottom:8px !important;
            padding:12px !important;
          }
          .resp-content{
            padding-bottom: 340px !important;
          }
        }
      `}</style>

      {!authUser ? (
        authView === "login" ? (
          <Login onSwitch={() => setAuthView("register")} onLogin={handleLoginSuccess} />
        ) : (
          <Register onSwitch={() => setAuthView("login")} onRegister={handleRegisterSuccess} />
        )
      ) : (
        <div className="resp-shell" style={{ display: "flex", width: "100%", height: "100%", position: "relative" }}>
          <div style={{ position: "fixed", top: "14px", right: "16px", zIndex: 20000 }}>
            <button
              onClick={() => goTo("profile")}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(6px)",
                cursor: "pointer",
                overflow: "hidden",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 900,
                boxShadow: "0 10px 25px rgba(0,0,0,0.45)"
              }}
              title="Profile"
            >
              {getAvatar() ? (
                <img src={getAvatar()} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 18 }}>{getMonogram()}</span>
              )}
            </button>
          </div>

          <div
            className="resp-sidebar"
            style={{
              width: "220px",
              background: "rgba(0,0,0,0.85)",
              padding: "20px 0 20px 10px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              borderRight: "2px solid rgba(255,255,255,0.08)"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingRight: "20px",
                paddingLeft: "10px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={toggleMenuFromLogo}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <div className="logo-wrapper">
                    <img
                      src="/logo512.png"
                      alt="Music Finder logo"
                      style={{
                        height: "60px",
                        width: "60px",
                        borderRadius: "12px",
                        objectFit: "cover",
                        transition: "box-shadow 0.4s ease-in-out"
                      }}
                    />
                  </div>
                </button>

                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "#fff",
                    letterSpacing: "0.5px"
                  }}
                >
                  Music Finder♪
                </span>
              </div>
            </div>

            <div
              className="resp-sidebar-menu"
              style={{
                maxHeight: menuOpen ? "500px" : "0px",
                overflow: "hidden",
                transition: "max-height 0.45s ease",
                paddingRight: "20px"
              }}
            >
              <div
                style={{
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? "translateY(0px)" : "translateY(-10px)",
                  transition: "opacity 0.35s ease, transform 0.35s ease"
                }}
              >
                <MenuButton label="Home" active={view === "home"} onClick={() => goTo("home")} />
                <MenuButton label="Search" active={view === "search"} onClick={() => goTo("search")} />
                <MenuButton label="Favorites" active={view === "favorites"} onClick={() => goTo("favorites")} />
                <MenuButton label="Profile" active={view === "profile"} onClick={() => goTo("profile")} />

                <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "8px 0" }} />

                <MenuButton label="Logout" danger onClick={handleLogout} />
              </div>
            </div>
          </div>

          <div
            className="resp-content resp-page-padding"
            style={{
              flex: 1,
              padding: "20px",
              overflowY: "auto",
              overflowX: "hidden",
              height: "100%",
              boxSizing: "border-box"
            }}
          >
            {view === "home" && (
              <>
                <h1>Home</h1>
                {songs.length === 0 ? (
                  <p>You have no musics yet, search on the Search page.</p>
                ) : (
                  <SongList
                    songs={songs}
                    currentSong={currentSong}
                    onSelect={(song) => {
                      saveCurrentTimeBeforeSwitch();
                      setCurrentSong(song);
                      setShowPlayer(true);
                    }}
                    onDelete={deleteSong}
                  />
                )}
              </>
            )}

            {view === "search" && (
              <div style={{ padding: "10px" }}>
                <h1>Search</h1>

                <div style={{ position: "relative", display: "flex", gap: "10px", margin: "20px 0" }}>
                  <input
                    type="text"
                    placeholder={noResults ? `No results found for "${lastSearchQuery}"!` : "Write an artist or a music..."}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (noResults) setNoResults(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        searchYouTube();
                        setSearchQuery("");
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 40px 10px 12px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                      background: "#fff",
                      color: "#000",
                      fontSize: "14px",
                      outline: "none"
                    }}
                  />

                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      style={{
                        position: "absolute",
                        right: "calc(90px + 10px)",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: "transparent",
                        border: "2px solid rgba(0,0,0,0.3)",
                        color: "#000",
                        fontSize: "14px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      ✕
                    </button>
                  )}

                  <button
                    onClick={() => {
                      searchYouTube();
                      setSearchQuery("");
                    }}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "6px",
                      border: "none",
                      background: "#1db954",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "14px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      width: "90px"
                    }}
                  >
                    Search
                  </button>
                </div>

                {searchLoading && <p>Searching...</p>}
                {searchError && <p>{searchError}</p>}

                {searchResults.length > 0 ? (
                  <div style={{ marginBottom: "30px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <h2 style={{ margin: 0 }}>Results</h2>

                      <button
                        onClick={() => setSearchResults([])}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          background: "#ff3b3b",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "13px"
                        }}
                      >
                        DELETE
                      </button>
                    </div>

                    {searchResults.map((item) => {
                      const isActive = currentSong?.videoId === item.id.videoId;

                      return (
                        <div
                          key={item.id.videoId}
                          onClick={() => {
                            saveCurrentTimeBeforeSwitch();
                            addYouTubeTrack(item);
                            setShowPlayer(true);
                          }}
                          style={{
                            padding: "10px",
                            marginBottom: "10px",
                            background: isActive ? "rgba(30, 215, 96, 0.25)" : "#282828",
                            border: isActive ? "1px solid #1db954" : "1px solid transparent",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px"
                          }}
                        >
                          <img
                            src={item.snippet.thumbnails.default.url}
                            alt={item.snippet.title}
                            style={{ width: "40px", height: "40px", borderRadius: "4px" }}
                          />

                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: "600" }} className="resp-ellipsis">
                              {item.snippet.title}
                            </div>
                            <div style={{ fontSize: "13px", color: "#ccc" }} className="resp-ellipsis">
                              {item.snippet.channelTitle}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}

            {view === "favorites" && (
              <>
                <h1>Favorites</h1>
                {favorites.length === 0 ? (
                  <p>You have no favorite musics</p>
                ) : (
                  <SongList
                    songs={favorites}
                    currentSong={currentSong}
                    onSelect={(song) => {
                      saveCurrentTimeBeforeSwitch();
                      setCurrentSong(song);
                      setShowPlayer(true);
                    }}
                    onDelete={deleteFavorite}
                  />
                )}
              </>
            )}

            {view === "profile" && (
              <Profile userEmail={authUser} songs={songs} favorites={favorites} onLogout={handleLogout} />
            )}
          </div>

          {currentSong && showPlayer && (
            <div
              className="resp-player"
              style={{
                position: "absolute",
                bottom: "20px",
                right: "20px",
                width: "420px",
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(6px)",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                zIndex: 5
              }}
            >
              <>
                <Player
                  song={currentSong}
                  view={view}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  onToggleFavorite={() => toggleFavorite(currentSong)}
                  isFavorite={favorites.some((s) => s.id === currentSong.id)}
                  onDelete={onPlayerDelete}
                  resumeTime={resumeTimes[currentSong.id] || 0}
                  onSaveTime={onPlayerSaveTime}
                  onClose={onPlayerClose}
                  onShowLyrics={(song) => setLyricsSong(song)}
                />

                {lyricsSong && <LyricsModal song={lyricsSong} onClose={() => setLyricsSong(null)} />}
              </>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuButton({ label, active, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        borderRadius: "6px",
        border: "none",
        marginBottom: "4px",
        cursor: "pointer",
        background: active ? "#1db954" : danger ? "rgba(255, 80, 80, 0.25)" : "rgba(255,255,255,0.06)",
        color: "#fff",
        fontWeight: danger ? "600" : "500",
        fontSize: "14px",
        transition: "0.2s"
      }}
    >
      {label}
    </button>
  );
}

export default App;