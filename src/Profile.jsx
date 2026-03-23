import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";

export default function Profile({ user, songs = [], favorites = [], onLogout, onUserUpdate }) {
  const fileInputRef = useRef(null);

  // ===== Profile picture (draft vs saved) =====
  const [selectedFileName, setSelectedFileName] = useState("No file selected");
  const [draftPicDataUrl, setDraftPicDataUrl] = useState("");
  const [savedPicDataUrl, setSavedPicDataUrl] = useState("");

  // ===== Email (draft) =====
  const [newEmail, setNewEmail] = useState(user?.username || "");
  const [confirmEmail, setConfirmEmail] = useState(user?.username || "");
  const [focusedInput, setFocusedInput] = useState(null);

  // ===== Password (draft) =====
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saveMsg, setSaveMsg] = useState("");

  // load profile pic from user prop
  useEffect(() => {
    const v = user?.profile_pic || "";
    setSavedPicDataUrl(v);
    setDraftPicDataUrl(v);
    setSelectedFileName("No file selected");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [user?.profile_pic]);

  // sync email fields (draft only)
  useEffect(() => {
    const v = user?.username || "";
    setNewEmail(v);
    setConfirmEmail(v);
  }, [user?.username]);

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

  // draft-only
  const handleDeletePicture = () => {
    setSaveMsg("");
    setDraftPicDataUrl("");
    setSelectedFileName("No file selected");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteAccount = async () => {
    try {
      await api('/api/users/me', { method: 'DELETE' });
    } catch {}
    if (onLogout) onLogout();
  };

  const saveAll = async () => {
    const changed = [];

    const prevUsername = user?.username || "";

    // 1) PROFILE PICTURE
    if (draftPicDataUrl !== savedPicDataUrl) {
      try {
        const res = await api('/api/users/me/profile-pic', {
          method: 'PUT',
          body: JSON.stringify({ profile_pic: draftPicDataUrl || null })
        });
        if (res.ok) {
          setSavedPicDataUrl(draftPicDataUrl || "");
          if (onUserUpdate) onUserUpdate(prev => ({ ...prev, profile_pic: draftPicDataUrl || null }));
          changed.push("Profile picture saved.");
        }
      } catch {}
    }

    // 2) USERNAME (email field)
    const nextEmail = String(newEmail || "").trim();
    const confEmail = String(confirmEmail || "").trim();

    if (nextEmail && nextEmail === confEmail && nextEmail !== prevUsername) {
      try {
        const res = await api('/api/users/me', {
          method: 'PATCH',
          body: JSON.stringify({ username: nextEmail })
        });
        if (res.ok) {
          if (onUserUpdate) onUserUpdate(prev => ({ ...prev, username: nextEmail }));
          changed.push("Email saved.");
        } else {
          const data = await res.json().catch(() => ({}));
          changed.push(`Email error: ${data.error || 'failed'}`);
        }
      } catch {}
    }

    // 3) PASSWORD
    const p1 = String(newPass || "").trim();
    const p2 = String(confirmPass || "").trim();

    if (p1 || p2) {
      if (p1 && p2 && p1 === p2 && p1.length >= 3) {
        try {
          const res = await api('/api/users/me', {
            method: 'PATCH',
            body: JSON.stringify({ password: p1 })
          });
          if (res.ok) {
            setNewPass("");
            setConfirmPass("");
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            changed.push("Password saved.");
          } else {
            const data = await res.json().catch(() => ({}));
            changed.push(`Password error: ${data.error || 'failed'}`);
          }
        } catch {}
      }
    }

    setSaveMsg(changed.join(" ") || "");
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