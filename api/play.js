import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Missing channel ID');
  }

  // URL Master Stream SBS Viceland asli (Kita bersihkan token expired-nya)
  const originalUrl = "https://sbs-live-prod-01.akamaized.net/Content/HLS_AES_TS/live/geo/channel(viceland)/master.m3u8";

  try {
    // Lakukan request ke CDN Akamai SBS Australia dengan memalsukan header lokasi
    const response = await fetch(originalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.sbs.com.au/',
        'Origin': 'https://www.sbs.com.au',
        // Taktik Bypass Geoblock: Tembak IP acak perumahan di kota Sydney, Australia
        'X-Forwarded-For': '101.160.0.1', 
        'X-Real-IP': '101.160.0.1',
        'Accept-Language': 'en-AU,en;q=0.9'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`OTT Australia menolak akses. Status: ${response.status}`);
    }

    const m3u8Content = await response.text();

    // Mengubah jalur relative path di dalam M3U8 menjadi absolute URL ke server asli
    const baseUrl = originalUrl.substring(0, originalUrl.lastIndexOf('/'));
    const rewrittenContent = m3u8Content.replace(/^(?!#)(.+)$/mg, `${baseUrl}/$1`);

    // Set header agar dibaca sebagai format IPTV Player yang valid
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return res.status(200).send(rewrittenContent);

  } catch (error) {
    return res.status(500).send('Proxy Error: ' + error.message);
  }
}
