export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Missing channel ID');
  }

  // URL Master Stream SBS Viceland asli tanpa token expired
  const originalUrl = "https://sbs-live-prod-01.akamaized.net/Content/HLS_AES_TS/live/geo/channel(viceland)/master.m3u8";

  try {
    // Menggunakan native fetch bawaan Node.js modern di Vercel (mencegah eror crash 500)
    const response = await fetch(originalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': 'https://www.sbs.com.au/',
        'Origin': 'https://www.sbs.com.au',
        // Menyuntikkan IP Perumahan di Sydney (Australia) agar lolos geoblock dari luar server Sydney
        'X-Forwarded-For': '101.160.0.1', 
        'X-Real-IP': '101.160.0.1',
        'Accept': '*/*',
        'Accept-Language': 'en-AU,en;q=0.9'
      }
    });

    if (!response.ok) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(response.status).send(`CDN Akamai menolak akses. Status: ${response.status}`);
    }

    const m3u8Content = await response.text();

    // Mengubah jalur relative path di dalam M3U8 menjadi absolute URL ke server asli Akamai
    const baseUrl = originalUrl.substring(0, originalUrl.lastIndexOf('/'));
    const rewrittenContent = m3u8Content.replace(/^(?!#)(.+)$/mg, `${baseUrl}/$1`);

    // Set header wajib untuk respon IPTV
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return res.status(200).send(rewrittenContent);

  } catch (error) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(500).send('Proxy Error: ' + error.message);
  }
}
