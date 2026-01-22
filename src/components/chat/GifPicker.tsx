import React, { useState, useEffect } from "react";

interface GifResult {
  id: string;
  url: string;
  title: string;
}

interface Props {
  onSelectGif: (gifUrl: string) => void;
  onClose: () => void;
}

const GifPicker: React.FC<Props> = ({ onSelectGif, onClose }) => {
  const [search, setSearch] = useState("");
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!search.trim()) {
      setGifs([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const query = encodeURIComponent(search);
        // Use Giphy API with your actual API key
        const url = `https://api.giphy.com/v1/gifs/search?q=${query}&limit=12&api_key=ufYk0eNJvCLbAINxLkkM8QiKNG4vIqiS`;
        
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        });

        if (!res.ok) {
          console.error("Giphy API response:", res.status, res.statusText);
          throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();
        console.log("Giphy response:", data);
        
        const results: GifResult[] = (data.data || []).map((gif: any) => ({
          id: gif.id,
          url: gif.images.fixed_height?.url || gif.images.original?.url || gif.url,
          title: gif.title || "GIF",
        }));
        
        if (results.length === 0) {
          setError("No GIFs found for that search");
        } else {
          setGifs(results);
        }
      } catch (err) {
        console.error("Failed to fetch GIFs:", err);
        setError("Failed to load GIFs. Trying a different source...");
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => window.clearTimeout(handle);
  }, [search]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "100%",
        left: 0,
        right: 0,
        backgroundColor: "#1a1f35",
        border: "1px solid #374151",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "8px",
        maxWidth: "500px",
        boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.3)",
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "0.9rem", color: "#e5e7eb" }}>
          Search GIFs
        </h3>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#9ca3af",
            cursor: "pointer",
            fontSize: "1.2rem",
          }}
        >
          ✕
        </button>
      </div>

      <input
        type="text"
        placeholder="Search for GIFs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "6px 8px",
          borderRadius: "4px",
          border: "1px solid #374151",
          backgroundColor: "#020617",
          color: "#e5e7eb",
          fontSize: "0.8rem",
          boxSizing: "border-box",
          outline: "none",
          marginBottom: "8px",
        }}
      />

      {error && (
        <div
          style={{
            fontSize: "0.75rem",
            color: "#fecaca",
            marginBottom: "8px",
          }}
        >
          {error}
        </div>
      )}

      {isLoading && (
        <div
          style={{
            fontSize: "0.8rem",
            color: "#9ca3af",
            textAlign: "center",
            padding: "8px",
          }}
        >
          Searching...
        </div>
      )}

      {!isLoading && gifs.length === 0 && search.trim() && (
        <div
          style={{
            fontSize: "0.8rem",
            color: "#9ca3af",
            textAlign: "center",
            padding: "8px",
          }}
        >
          No GIFs found
        </div>
      )}

      {gifs.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {gifs.map((gif) => (
            <button
              key={gif.id}
              type="button"
              onClick={() => {
                onSelectGif(gif.url);
                onClose();
              }}
              title={gif.title}
              style={{
                background: "none",
                border: "1px solid #374151",
                borderRadius: "4px",
                cursor: "pointer",
                padding: 0,
                overflow: "hidden",
                height: "100px",
                transition: "border-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#38bdf8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#374151";
              }}
            >
              <img
                src={gif.url}
                alt={gif.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GifPicker;
