import { useState } from "react";

function Search({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query) return;

    const res = await fetch(
      `https://yt-api-server.vercel.app/search?q=${encodeURIComponent(query)}`
    );
    const data = await res.json();

    setResults(data.videos || []);
    setSearched(true);
  };

  const noResults = searched && results.length === 0;

  return (
    <div>
      <input
        type="text"
        placeholder={
          noResults
            ? "There is no video with this title!"
            : "Searching on Youtube..."
        }
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #333",
          background: "#111",
          color: "#fff",
          marginBottom: "12px",
          fontSize: "14px",
          outline: "none"
        }}
      />

      <button
        onClick={handleSearch}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          background: "#1db954",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          fontSize: "15px",
          marginBottom: "20px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease"
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(0.97)";
          e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.4)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
          e.target.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
        }}
      >
        Keresés
      </button>

      {results.map((video) => (
        <div
          key={video.videoId}
          onClick={() =>
            onSelect({
              videoId: video.videoId,
              title: video.title,
              channel: video.channel
            })
          }
          style={{
            background: "rgba(255,255,255,0.05)",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "14px",
            cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.1)"
          }}
        >
          <div style={{ marginBottom: "10px" }}>
            <iframe
              width="100%"
              height="200"
              src={`https://www.youtube.com/embed/${video.videoId}`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                borderRadius: "8px",
                pointerEvents: "none"
              }}
            ></iframe>
          </div>

          <div style={{ fontSize: "14px", fontWeight: "600" }}>{video.title}</div>
          <div style={{ fontSize: "12px", color: "#bbb", marginTop: "4px" }}>
            {video.channel}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Search;