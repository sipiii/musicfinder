export default function SongList({ songs, currentSong, onSelect }) {
  return (
    <div style={styles.list}>
      {songs.map((song) => {
        const isActive = currentSong?.id === song.id;

        return (
          <div
            key={song.id}
            onClick={() => onSelect(song)}
            style={{
              ...styles.item,
              background: isActive ? "rgba(30, 215, 96, 0.25)" : "rgba(255,255,255,0.05)",
              border: isActive ? "1px solid #1db954" : "1px solid transparent"
            }}
          >
            {/* THUMBNAIL */}
            {song.artwork && (
              <img
                src={song.artwork}
                alt="Thumbnail"
                style={styles.thumbnail}
              />
            )}

            {/* TITLE + ARTIST */}
            <div style={styles.textBlock}>
              <div style={styles.title}>{song.title}</div>
              <div style={styles.artist}>{song.artist}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* 🎨 STÍLUSOK */

const styles = {
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "10px"
  },

  item: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "0.2s",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
  },

  thumbnail: {
    width: "48px",
    height: "48px",
    borderRadius: "6px",
    objectFit: "cover",
    boxShadow: "0 0 6px rgba(0,0,0,0.3)"
  },

  textBlock: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },

  title: {
    fontWeight: "600",
    fontSize: "15px",
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },

  artist: {
    fontSize: "13px",
    color: "#ccc",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  }
};