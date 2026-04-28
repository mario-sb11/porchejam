require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// CACHÉ
const audioCache = new Map();

// =========================================================================
// 1. RUTA: TOP GLOBAL
// =========================================================================
app.get('/api/top-playlists', async (req, res) => {
  try {
    const response = await fetch('https://api.deezer.com/search/playlist?q=Exitos España&limit=12');
    const data = await response.json();

    const formatted = data.data.map(p => ({
      id: p.id.toString(),
      name: p.title,
      cover: p.picture_medium,
      songCount: p.nb_tracks || "Varias",
      type: "playlist"
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Fallo al cargar los éxitos" });
  }
});

// =========================================================================
// 2. RUTA: BUSCADOR GLOBAL
// =========================================================================
app.get('/api/search', async (req, res) => {
  const { q, type } = req.query;
  if (!q) return res.json([]);

  try {
    let deezerUrl = '';
    if (type === 'artist') {
      deezerUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}&limit=15`;
    } else if (type === 'track') {
      deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=15`;
    } else {
      deezerUrl = `https://api.deezer.com/search/playlist?q=${encodeURIComponent(q)}&limit=15`;
    }

    const response = await fetch(deezerUrl);
    const data = await response.json();

    const formatted = (data.data || []).map(item => ({
      id: item.id.toString(),
      name: item.name || item.title,
      cover: type === 'track' ? (item.album ? item.album.cover_medium : '') : item.picture_medium,
      artistName: type === 'track' ? item.artist.name : undefined,
      type: type
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Fallo en la búsqueda" });
  }
});

// =========================================================================
// 3. RUTA: EXTRAER CANCIONES
// =========================================================================
app.get('/api/tracks', async (req, res) => {
  const { id, type, index = 0 } = req.query;
  if (!id || !type) return res.status(400).json({ error: "Faltan parámetros" });

  try {
    let deezerUrl = '';
    if (type === 'artist') deezerUrl = `https://api.deezer.com/artist/${id}/top?limit=50&index=${index}`;
    if (type === 'playlist') deezerUrl = `https://api.deezer.com/playlist/${id}/tracks?limit=50&index=${index}`;

    const response = await fetch(deezerUrl);
    const data = await response.json();

    const formattedTracks = (data.data || [])
      .map(t => ({
        id: t.id.toString(),
        name: t.title,
        artist: t.artist.name,
        previewUrl: t.preview,
        cover: t.album ? t.album.cover_medium : (t.artist ? t.artist.picture_medium : '🎵')
      }))
      .filter(t => t.previewUrl);

    const nextIndex = data.next ? parseInt(index) + 50 : null;
    res.json({ tracks: formattedTracks, nextIndex });
  } catch (error) {
    res.status(500).json({ error: "Fallo al extraer canciones" });
  }
});

// =========================================================================
// 4. RUTA: MOTOR DE EMERGENCIA AUDIO
// =========================================================================
app.get('/api/get-audio', async (req, res) => {
  const { song, artist } = req.query;
  if (!song) return res.status(400).json({ error: "Falta el nombre" });

  const cleanSong = song.split('-')[0].replace(/\(.*?\)/g, '').trim();
  const cleanArtist = artist ? artist.split(',')[0].split('&')[0].trim() : '';
  const cacheKey = `${cleanSong}-${cleanArtist}`.toLowerCase();

  if (audioCache.has(cacheKey)) {
    return res.json({ previewUrl: audioCache.get(cacheKey) });
  }

  try {
    const deezerUrl = `https://api.deezer.com/search?q=track:"${cleanSong}" artist:"${cleanArtist}"`;
    const response = await fetch(deezerUrl);
    const data = await response.json();

    if (data.data && data.data.length > 0 && data.data[0].preview) {
      audioCache.set(cacheKey, data.data[0].preview);
      return res.json({ previewUrl: data.data[0].preview });
    }
    
    audioCache.set(cacheKey, null);
    return res.json({ previewUrl: null });
  } catch (error) {
    return res.status(500).json({ error: "Fallo interno" });
  }
});

// =========================================================================
// 5. RUTA MUSIC RACE: OBTENER CONEXIONES PARA ARTISTA/CANCIÓN/ÁLBUM
// =========================================================================
app.get('/api/race/connections', async (req, res) => {
  const { id, type } = req.query;
  if (!id || !type) return res.status(400).json({ error: "Faltan parámetros", options: [] });

  try {
    const options = [];

    // --- RAMA 1: ESTAMOS EN UN ARTISTA ---
    if (type === 'artist') {
      // 1. Obtenemos info del artista para saber su nombre (vital para el paracaídas)
      const artistRes = await fetch(`https://api.deezer.com/artist/${id}`);
      const artistData = await artistRes.json();
      const artistName = artistData.name || "Artista";

      // 2. Pedimos Canciones, Álbumes y Similares
      const [tracksRes, albumsRes, relatedRes] = await Promise.allSettled([
        fetch(`https://api.deezer.com/artist/${id}/top?limit=10`).then(r => r.json()),
        fetch(`https://api.deezer.com/artist/${id}/albums?limit=5`).then(r => r.json()),
        fetch(`https://api.deezer.com/artist/${id}/related?limit=8`).then(r => r.json())
      ]);
      
      let tracksData = tracksRes.status === 'fulfilled' ? (tracksRes.value.data || []) : [];
      let albumsData = albumsRes.status === 'fulfilled' ? (albumsRes.value.data || []) : [];
      let relatedData = relatedRes.status === 'fulfilled' ? (relatedRes.value.data || []) : [];
      let relatedTitle = "Artistas Similares";

      // Si no hay similares, buscamos artistas con nombre parecido
      if (relatedData.length === 0) {
        const searchRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=10`);
        const searchData = await searchRes.json();
        relatedData = (searchData.data || []).filter(a => a.id.toString() !== id.toString());
        relatedTitle = "Artistas con Nombre Similar";
      }

      // Si tiene un nombre rarísimo y tampoco sale nada, tiramos del Top Global
      if (relatedData.length === 0) {
        const chartRes = await fetch(`https://api.deezer.com/chart/0/artists?limit=8`);
        const chartData = await chartRes.json();
        relatedData = chartData.data || [];
        relatedTitle = "Top Global (Modo Rescate)";
      }

      const tracks = tracksData.map(t => ({
        id: t.id.toString(), name: t.title, type: 'track', artistName: t.artist ? t.artist.name : '', cover: t.album ? t.album.cover_medium : ''
      }));

      const albums = albumsData.map(a => ({
        id: a.id.toString(), name: a.title, type: 'album', artistName: 'Álbum', cover: a.cover_medium
      }));

      const related = relatedData.map(a => ({
        id: a.id.toString(), name: a.name, type: 'artist', cover: a.picture_medium
      }));

      if (tracks.length > 0) options.push({ title: "Canciones Populares", items: tracks });
      if (albums.length > 0) options.push({ title: "Álbumes Destacados", items: albums });
      if (related.length > 0) options.push({ title: relatedTitle, items: related });

      return res.json({ options });
    } 
    
    // --- RAMA 2: ESTAMOS EN UNA CANCIÓN ---
    if (type === 'track') {
      const trackRes = await fetch(`https://api.deezer.com/track/${id}`);
      const trackData = await trackRes.json();
      if (trackData.error) return res.json({ options: [] });

      let trackArtists = (trackData.contributors || []).map(a => ({
        id: a.id.toString(), name: a.name, type: 'artist', cover: a.picture_medium
      }));

      if (trackArtists.length === 0 && trackData.artist) {
        trackArtists = [{ id: trackData.artist.id.toString(), name: trackData.artist.name, type: 'artist', cover: trackData.artist.picture_medium }];
      }

      const mainArtistId = trackData.artist.id;
      const [topTracksRes, similarArtistsRes] = await Promise.allSettled([
        fetch(`https://api.deezer.com/artist/${mainArtistId}/top?limit=8`).then(r => r.json()),
        fetch(`https://api.deezer.com/artist/${mainArtistId}/related?limit=8`).then(r => r.json())
      ]);

      let topTracksData = topTracksRes.status === 'fulfilled' ? (topTracksRes.value.data || []) : [];
      let similarArtistsData = similarArtistsRes.status === 'fulfilled' ? (similarArtistsRes.value.data || []) : [];
      let similarTitle = "Artistas Similares";
      let tracksTitle = "Otras canciones del artista";

      // CANCIÓN 1: Artistas con el mismo nombre
      if (similarArtistsData.length === 0 && trackData.artist) {
        const searchRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(trackData.artist.name)}&limit=8`);
        const searchData = await searchRes.json();
        similarArtistsData = (searchData.data || []).filter(a => a.id.toString() !== mainArtistId.toString());
        similarTitle = "Artistas con Nombre Similar";
      }

      // CANCIÓN 2: Canciones con el mismo título (Si el artista solo tiene 1 canción)
      if (topTracksData.length <= 1) {
        const searchRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(trackData.title)}&limit=8`);
        const searchData = await searchRes.json();
        topTracksData = searchData.data || [];
        tracksTitle = "Canciones con Título Similar";
      }

      const recommendedTracks = topTracksData.filter(t => t.id.toString() !== id.toString()).map(t => ({
          id: t.id.toString(), name: t.title, type: 'track', artistName: t.artist ? t.artist.name : '', cover: t.album ? t.album.cover_medium : ''
      }));

      const similarArtists = similarArtistsData.map(a => ({
        id: a.id.toString(), name: a.name, type: 'artist', cover: a.picture_medium
      }));

      if (trackArtists.length > 0) options.push({ title: "Artistas en esta pista", items: trackArtists });
      if (trackData.album) options.push({ title: "Pertenece al Álbum", items: [{ id: trackData.album.id.toString(), name: trackData.album.title, type: 'album', cover: trackData.album.cover_medium }]});
      if (recommendedTracks.length > 0) options.push({ title: tracksTitle, items: recommendedTracks });
      if (similarArtists.length > 0) options.push({ title: similarTitle, items: similarArtists });

      return res.json({ options });
    }

    // --- RAMA 3: ESTAMOS EN UN ÁLBUM ---
    if (type === 'album') {
      const albumRes = await fetch(`https://api.deezer.com/album/${id}`);
      const albumData = await albumRes.json();
      if (albumData.error) return res.json({ options: [] });

      const albumArtist = albumData.artist ? [{
        id: albumData.artist.id.toString(), name: albumData.artist.name, type: 'artist', cover: albumData.artist.picture_medium
      }] : [];

      const tracks = (albumData.tracks?.data || []).map(t => ({
        id: t.id.toString(), name: t.title, type: 'track', artistName: t.artist ? t.artist.name : '', cover: albumData.cover_medium
      }));

      if (albumArtist.length > 0) options.push({ title: "Artista del Álbum", items: albumArtist });
      if (tracks.length > 0) options.push({ title: "Canciones en el Álbum", items: tracks });

      return res.json({ options });
    }

    return res.json({ options: [] });
  } catch (error) {
    console.error("Error en /api/race/connections:", error);
    res.status(500).json({ error: "Fallo al obtener conexiones", options: [] });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
});