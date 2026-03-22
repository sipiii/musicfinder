import { useState } from "react";

export default function Register({ onSwitch, onRegister }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

  const handleRegister = () => {
    const em = email.trim();
    const pw = password.trim();

    if (!em || !pw) {
      setError("Please enter your email and password!");
      return;
    }

    if (!isValidEmail(em)) {
      setError("Please enter a valid email address!");
      return;
    }

    let users = [];
    try {
      const raw = localStorage.getItem("users");
      users = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(users)) users = [];
    } catch {
      users = [];
    }

    const exists = users.some((u) => String(u?.email || "").trim().toLowerCase() === em.toLowerCase());
    if (exists) {
      setError("This email is already registered. Please log in.");
      return;
    }

    const nextUsers = [...users, { email: em, password: pw }];
    try {
      localStorage.setItem("users", JSON.stringify(nextUsers));
    } catch {}

    try {
      localStorage.setItem("loggedInUser", em);
      localStorage.setItem("loggedInPassword", pw);
    } catch {}

    setError("");
    onRegister();
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at center, #1a1a1a 0%, #000000 80%)",
        fontFamily: "sans-serif"
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 0 20px rgba(0,0,0,0.6)",
          width: "320px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
      >
        <h2 style={{ color: "#fff", textAlign: "center" }}>Register</h2>

        {error && (
          <div style={{ color: "red", textAlign: "center", marginBottom: "-8px" }}>
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          autoComplete="off"
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: "none",
            background: "#222",
            color: "#fff"
          }}
        />

        <div
          style={{
            position: "relative",
            width: "100%",
            background: "#222",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center"
          }}
        >
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            autoComplete="new-password"
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "10px 40px 10px 10px",
              border: "none",
              background: "transparent",
              color: "#fff",
              width: "100%",
              outline: "none"
            }}
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "10px",
              cursor: "pointer",
              fontSize: "20px",
              color: "#ccc"
            }}
          >
            {showPassword ? "🔓" : "🔒"}
          </span>
        </div>

        <button
          onClick={handleRegister}
          style={{
            padding: "12px",
            borderRadius: "6px",
            border: "none",
            background: "#1db954",
            color: "#fff",
            fontWeight: "600",
            cursor: "pointer",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
          }}
        >
          Register
        </button>

        <button
          onClick={onSwitch}
          style={{
            background: "transparent",
            border: "none",
            color: "#ccc",
            fontSize: "14px",
            cursor: "pointer",
            textDecoration: "underline",
            transition: "transform 0.15s ease"
          }}
        >
          Already have an Account? Log in
        </button>
      </div>
    </div>
  );
}