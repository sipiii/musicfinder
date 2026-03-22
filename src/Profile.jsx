import { useEffect, useMemo, useRef, useState } from "react";

export default function Profile({ userEmail, songs = [], favorites = [], onLogout }) {
  const fileInputRef = useRef(null);

  // ===== Profile picture (draft vs saved) =====
  const [selectedFileName, setSelectedFileName] = useState("No file selected");
  const [draftPicDataUrl, setDraftPicDataUrl] = useState("");
  const [savedPicDataUrl, setSavedPicDataUrl] = useState("");

  // ===== Email (draft) =====
  const [newEmail, setNewEmail] = useState(userEmail || "");
  const [confirmEmail, setConfirmEmail] = useState(userEmail || "");
  const [focusedInput, setFocusedInput] = useState(null);

  // ===== Password (draft) =====
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  // 🔒 like Login/Register
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // bottom status: ONLY the items that actually changed this save
  const [saveMsg, setSaveMsg] = useState("");

  // load current saved profile pic into both saved+draft
  useEffect(() => {
    let v = "";
    try {
      v = localStorage.getItem(`profilePic_${userEmail}`) || "";
    } catch {
      v = "";
    }
    setSavedPicDataUrl(v);
    setDraftPicDataUrl(v);
    setSelectedFileName("No file selected");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [userEmail]);

  // sync email fields (draft only)
  useEffect(() => {
    const v = userEmail || "";
    setNewEmail(v);
    setConfirmEmail(v);
  }, [userEmail]);

  const favoriteArtist = useMemo(() => {
    const all = Array.isArray(songs) ? songs : [];
    const counts = new Map();

    for (const s of all) {
      const a = (s?.artist || "").toString().trim();
      if (!a) continue;
      const clean = a.replace(/VEVO/gi, "").trim();
      if (!clean) continue;
      counts.set(clean, (counts.get(clean) || 0) + 1);
    }

    let best = "";
    let bestCount = -1;
    for (const [k, v] of counts.entries()) {
      if (v > bestCount) {
        best = k;
        bestCount = v;
      }
    }
    return best || "—";
  }, [songs]);

  const validateEmail = (value) => {
    const v = String(value || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };

  // draft-only
  const handleFilePick = (e) => {
    setSaveMsg("");
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFileName("No file selected");
      return;
    }

    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setDraftPicDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // draft-only (no localStorage until Save)
  const handleDeletePicture = () => {
    setSaveMsg("");
    setDraftPicDataUrl("");
    setSelectedFileName("No file selected");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteAccount = () => {
    try {
      localStorage.removeItem("loggedInUser");
      localStorage.removeItem("loggedInPassword");
    } catch {}

    try {
      localStorage.removeItem(`profilePic_${userEmail}`);
    } catch {}

    try {
      const raw = localStorage.getItem("users");
      if (raw) {
        const users = JSON.parse(raw);
        if (Array.isArray(users)) {
          const updated = users.filter((u) => {
            if (!u) return false;
            const em = (u.email || u.user || u.username || "").toString().trim();
            return em !== userEmail;
          });
          localStorage.setItem("users", JSON.stringify(updated));
        }
      }
    } catch {}

    if (onLogout) onLogout();
  };

  const saveAll = () => {
    // we will only list things that actually changed (and were saved successfully)
    const changed = [];

    // current identity
    const prevEmail = String(localStorage.getItem("loggedInUser") || userEmail || "").trim();
    let finalEmail = prevEmail;

    // 1) PROFILE PICTURE
    // only if draft differs from saved
    if (draftPicDataUrl !== savedPicDataUrl) {
      try {
        const key = `profilePic_${prevEmail}`;
        if (!draftPicDataUrl) localStorage.removeItem(key);
        else localStorage.setItem(key, draftPicDataUrl);

        setSavedPicDataUrl(draftPicDataUrl || "");
        changed.push("Profile picture saved.");
      } catch {
        // if failed, do not claim it changed
      }
    }

    // 2) EMAIL
    const nextEmail = String(newEmail || "").trim();
    const confEmail = String(confirmEmail || "").trim();

    const emailRequestedChange = nextEmail !== prevEmail || confEmail !== prevEmail;
    if (emailRequestedChange) {
      if (nextEmail && confEmail && nextEmail === confEmail && validateEmail(nextEmail) && nextEmail !== prevEmail) {
        // check duplicates
        let dup = false;
        try {
          const raw = localStorage.getItem("users");
          if (raw) {
            const users = JSON.parse(raw);
            if (Array.isArray(users)) {
              dup = users.some((u) => {
                const em = (u?.email || u?.user || u?.username || "").toString().trim();
                return em.toLowerCase() === nextEmail.toLowerCase() && em.toLowerCase() !== prevEmail.toLowerCase();
              });
            }
          }
        } catch {}

        if (!dup) {
          // update loggedInUser
          try {
            localStorage.setItem("loggedInUser", nextEmail);
          } catch {}

          // migrate profile picture key
          try {
            const oldKey = `profilePic_${prevEmail}`;
            const newKey = `profilePic_${nextEmail}`;
            const pic = localStorage.getItem(oldKey);
            if (pic !== null) {
              localStorage.setItem(newKey, pic);
              localStorage.removeItem(oldKey);
            } else {
              localStorage.removeItem(newKey);
            }
          } catch {}

          // update users array
          try {
            const raw = localStorage.getItem("users");
            if (raw) {
              const users = JSON.parse(raw);
              if (Array.isArray(users)) {
                const updated = users.map((u) => {
                  if (!u) return u;
                  const em = (u.email || u.user || u.username || "").toString().trim();
                  if (em !== prevEmail) return u;

                  const copy = { ...u };
                  if (Object.prototype.hasOwnProperty.call(copy, "email")) copy.email = nextEmail;
                  if (Object.prototype.hasOwnProperty.call(copy, "user")) copy.user = nextEmail;
                  if (Object.prototype.hasOwnProperty.call(copy, "username")) copy.username = nextEmail;
                  return copy;
                });
                localStorage.setItem("users", JSON.stringify(updated));
              }
            }
          } catch {}

          finalEmail = nextEmail;

          // refresh pic snapshot under new email (so UI stays correct)
          try {
            const v = localStorage.getItem(`profilePic_${nextEmail}`) || "";
            setSavedPicDataUrl(v);
            setDraftPicDataUrl(v);
            setSelectedFileName("No file selected");
            if (fileInputRef.current) fileInputRef.current.value = "";
          } catch {}

          changed.push("Email saved.");
        }
      }
    }

    // 3) PASSWORD
    const p1 = String(newPass || "").trim();
    const p2 = String(confirmPass || "").trim();

    // only attempt if user entered anything
    if (p1 || p2) {
      if (p1 && p2 && p1 === p2 && p1.length >= 3) {
        try {
          localStorage.setItem("loggedInPassword", p1);
        } catch {}

        // update users array for finalEmail
        try {
          const raw = localStorage.getItem("users");
          if (raw) {
            const users = JSON.parse(raw);
            if (Array.isArray(users)) {
              const updated = users.map((u) => {
                if (!u) return u;
                const em = (u.email || u.user || u.username || "").toString().trim();
                if (em !== finalEmail) return u;
                return { ...u, password: p1 };
              });
              localStorage.setItem("users", JSON.stringify(updated));
            }
          }
        } catch {}

        setNewPass("");
        setConfirmPass("");
        setShowNewPassword(false);
        setShowConfirmPassword(false);

        changed.push("Password saved.");
      }
    }

    // keep email inputs synced to what we actually have as logged in user (UI-only)
    const nowLoggedIn = String(localStorage.getItem("loggedInUser") || "").trim();
    if (nowLoggedIn) {
      setNewEmail(nowLoggedIn);
      setConfirmEmail(nowLoggedIn);
    }

    // show ONLY changed items; if nothing changed, show nothing (empty string)
    setSaveMsg(changed.join(" "));
  };

  // ====== UI helpers (lock-in-input pattern as Login/Register) ======
  const inputBase = {
    padding: "10px",
    borderRadius: "6px",
    background: "#222",
    color: "#fff",
    width: "100%",
    outline: "none"
  };

  const pwWrapStyle = {
    position: "relative",
    width: "100%",
    background: "#222",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center"
  };

  const pwIconStyle = {
    position: "absolute",
    right: "10px",
    cursor: "pointer",
    fontSize: "20px",
    color: "#ffcc00"
  };

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <h1 style={{ textAlign: "center", marginTop: 0 }}>Profile</h1>

      <div style={wrapCol}>
        {/* PROFILE PICTURE */}
        <div style={card}>
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                border: "3px solid rgba(29,185,84,0.75)",
                overflow: "hidden",
                background: "#111",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {draftPicDataUrl ? (
                <img
                  src={draftPicDataUrl}
                  alt="Profile"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 24 }}>User</div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Profile Picture</div>
              <div style={{ color: "#ccc", fontSize: 13, marginBottom: 10 }}>
                Upload a jpg/png image that appears in the top right corner.
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <label style={fileLabel}>
                  Choose file
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleFilePick}
                    style={{ display: "none" }}
                  />
                </label>

                <span style={{ color: "#ccc", fontSize: 13 }}>{selectedFileName}</span>

                <button onClick={handleDeletePicture} style={deleteBtn}>
                  Delete
                </button>

                {draftPicDataUrl !== savedPicDataUrl && (
                  <span style={{ color: "#ccc", fontSize: 12 }}>Unsaved changes</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* EMAIL */}
        <div style={card}>
          <div style={sectionHeaderRow}>
            <div style={sectionTitle}>Change Email</div>
          </div>

          <input
            type="email"
            placeholder="New email"
            value={newEmail}
            onFocus={() => setFocusedInput("email1")}
            onBlur={() => setFocusedInput(null)}
            onChange={(e) => {
              setSaveMsg("");
              setNewEmail(e.target.value);
            }}
            style={{ ...inputBase, border: focusedInput === "email1" ? "2px solid #fff" : "none" }}
          />

          <div style={{ height: 10 }} />

          <input
            type="email"
            placeholder="Confirm new email"
            value={confirmEmail}
            onFocus={() => setFocusedInput("email2")}
            onBlur={() => setFocusedInput(null)}
            onChange={(e) => {
              setSaveMsg("");
              setConfirmEmail(e.target.value);
            }}
            style={{ ...inputBase, border: focusedInput === "email2" ? "2px solid #fff" : "none" }}
          />
        </div>

        {/* PASSWORD */}
        <div style={card}>
          <div style={sectionHeaderRow}>
            <div style={sectionTitle}>Change Password</div>
          </div>

          <div style={pwWrapStyle}>
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="New password"
              value={newPass}
              autoComplete="new-password"
              onFocus={() => setFocusedInput("pass1")}
              onBlur={() => setFocusedInput(null)}
              onChange={(e) => {
                setSaveMsg("");
                setNewPass(e.target.value);
              }}
              style={{
                padding: "10px 40px 10px 10px",
                border: focusedInput === "pass1" ? "2px solid #fff" : "none",
                background: "transparent",
                color: "#fff",
                width: "100%",
                outline: "none",
                borderRadius: "6px"
              }}
            />
            <span onClick={() => setShowNewPassword(!showNewPassword)} style={pwIconStyle}>
              {showNewPassword ? "🔓" : "🔒"}
            </span>
          </div>

          <div style={{ height: 10 }} />

          <div style={pwWrapStyle}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPass}
              autoComplete="new-password"
              onFocus={() => setFocusedInput("pass2")}
              onBlur={() => setFocusedInput(null)}
              onChange={(e) => {
                setSaveMsg("");
                setConfirmPass(e.target.value);
              }}
              style={{
                padding: "10px 40px 10px 10px",
                border: focusedInput === "pass2" ? "2px solid #fff" : "none",
                background: "transparent",
                color: "#fff",
                width: "100%",
                outline: "none",
                borderRadius: "6px"
              }}
            />
            <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={pwIconStyle}>
              {showConfirmPassword ? "🔓" : "🔒"}
            </span>
          </div>
        </div>

        {/* STATS */}
        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Statistics</div>
          <div style={{ color: "#fff" }}>
            <div>Total songs added: {Array.isArray(songs) ? songs.length : 0}</div>
            <div>Total favorites: {Array.isArray(favorites) ? favorites.length : 0}</div>
            <div>
              Favorite artist: <b>{favoriteArtist}</b>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={handleDeleteAccount} style={dangerWideBtn}>
            Delete Account
          </button>

          <button onClick={saveAll} style={saveBtn}>
            Save
          </button>

          <button onClick={onLogout} style={grayWideBtn}>
            Logout
          </button>
        </div>

        {/* only show if something actually changed */}
        {saveMsg ? <div style={{ textAlign: "center", color: "#ccc" }}>{saveMsg}</div> : null}
      </div>
    </div>
  );
}

/* ===== styles ===== */
const wrapCol = {
  width: "100%",
  maxWidth: 720,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 18
};

const card = {
  width: "100%",
  background: "rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: 18,
  boxShadow: "0 0 18px rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxSizing: "border-box"
};

const sectionHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12
};

const sectionTitle = {
  fontWeight: 800,
  fontSize: 18
};

const saveBtn = {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "none",
  background: "#1db954",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  minWidth: 120
};

const deleteBtn = {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "none",
  background: "#8b1a1a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
};

const dangerWideBtn = {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "none",
  background: "#8b1a1a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  minWidth: 160
};

const grayWideBtn = {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "none",
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  minWidth: 120
};

const fileLabel = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  border: "1px solid rgba(255,255,255,0.16)"
};