export default function Sidebar({
  activePage,
  onChangePage,
  onLogout,
  menuOpen,
  setMenuOpen
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        color: "#fff",
        width: "100%",
        height: "100%",
        padding: "20px"
      }}
    >
      {/* LOGÓ + CÍM */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "10px"
        }}
      >
        <div className="app-logo-wrapper">
          <img
            src="/logo512.png"
            alt="Music Browser logo"
            style={{
              height: "48px",
              width: "48px",
              borderRadius: "10px",
              objectFit: "cover"
            }}
          />
        </div>

        <h2
          style={{
            fontSize: "20px",
            fontWeight: "600",
            letterSpacing: "0.5px",
            margin: 0
          }}
        >
          Music Browser♪
        </h2>
      </div>

      {/* MENÜ GOMB + AKTUÁLIS OLDAL */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          ...btnStyle,
          background: "rgba(255,255,255,0.1)",
          marginBottom: "10px"
        }}
      >
        Menü {menuOpen ? "▲" : "▼"}{" "}
        <span style={{ opacity: 0.6 }}>({pageLabel[activePage]})</span>
      </button>

      {/* LENYÍLÓ MENÜ */}
      <div
        style={{
          opacity: menuOpen ? 1 : 0,
          transform: menuOpen ? "translateY(0px)" : "translateY(-10px)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
          pointerEvents: menuOpen ? "auto" : "none",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}
      >
        {/* ... a többi gomb változatlan ... */}
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "12px 16px",
  borderRadius: "8px",
  border: "none",
  color: "#fff",
  fontSize: "16px",
  cursor: "pointer",
  textAlign: "left",
  transition: "0.2s",
  width: "100%"
};
