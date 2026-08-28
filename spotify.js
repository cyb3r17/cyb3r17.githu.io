// Live "now playing" from Discord/Spotify via Lanyard (api.lanyard.rest)
// The widget hides itself whenever nothing is playing.
(function () {
    const DISCORD_ID = "1504922234928758855";

    const wrap = document.getElementById("spotify");
    if (!wrap) return;
    const card = document.getElementById("spotify-link");
    const idle = document.getElementById("spotify-idle");
    const art = document.getElementById("spotify-art");
    const song = document.getElementById("spotify-song");
    const artist = document.getElementById("spotify-artist");
    const progress = document.getElementById("spotify-progress");

    let ws, heartbeat, spotify = null;

    function render(data) {
        const s = data && data.spotify;
        if (!data || !data.listening_to_spotify || !s) {
            spotify = null;
            card.hidden = true;
            idle.hidden = false;
            return;
        }
        spotify = s;
        song.textContent = s.song;
        artist.textContent = s.artist;
        art.src = s.album_art_url || "";
        card.href = s.track_id
            ? "https://open.spotify.com/track/" + s.track_id
            : "#";
        idle.hidden = true;
        card.hidden = false;
        updateProgress();
    }

    function updateProgress() {
        if (!spotify || !spotify.timestamps) return;
        const { start, end } = spotify.timestamps;
        if (!start || !end) { progress.style.width = "0%"; return; }
        const pct = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
        progress.style.width = pct + "%";
    }

    function connect() {
        ws = new WebSocket("wss://api.lanyard.rest/socket");

        ws.addEventListener("message", ({ data }) => {
            const msg = JSON.parse(data);
            if (msg.op === 1) {
                // Hello -> start heartbeat + subscribe to our presence
                clearInterval(heartbeat);
                heartbeat = setInterval(
                    () => ws.readyState === 1 && ws.send(JSON.stringify({ op: 3 })),
                    msg.d.heartbeat_interval
                );
                ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
            } else if (msg.op === 0 && (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE")) {
                render(msg.d);
            }
        });

        ws.addEventListener("close", () => {
            clearInterval(heartbeat);
            setTimeout(connect, 5000); // reconnect
        });
    }

    connect();
    setInterval(updateProgress, 1000); // advance the progress bar
})();
