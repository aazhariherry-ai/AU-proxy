import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Mengambil parameter ID dari URL yang diketik user
  const { id } = req.query; 

  if (!id) {
    return res.status(400).send('Missing channel ID');
  }

  // URL API sekarang otomatis berubah tergantung ID yang kamu masukkan di URL
  const sbsApiUrl = `https://api.sbs.com.au/video/v1/stream/${id}?platform=androidtv`;

  try {
    // 2. Tembak API SBS menggunakan region 'syd1' (Sydney) yang sudah kita set di vercel.json
    const apiResponse = await fetch(sbsApiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; BRAVIA 4K Smart TV) AppleWebKit/537.36',
        'Accept': 'application/json',
        // Jika SBS mendeteksi regional lewat header tambahan, tambahkan di sini
      }
    });

    if (!apiResponse.ok) {
      return res.status(apiResponse.status).send("Gagal mengambil token baru dari API SBS");
    }

    const data = await apiResponse.json();
    
    // 3. Ekstrak URL M3U8 yang sudah terpasang token baru dari response API
    // Catatan: Struktur JSON di bawah adalah contoh. Kamu perlu menyesuaikan `data.streamUrl` 
    // dengan key asli yang keluar dari API SBS (misal: data.urls[0].href atau sejenisnya)
    const masterM3u8Url = data.streamUrl || data.urls?.hls || ""; 

    if (!masterM3u8Url) {
      return res.status(500).send("Format API berubah, URL Stream tidak ditemukan.");
    }

    // 4. Ambil isi file master.m3u8 yang fresh dengan token baru tersebut
    const m3u8Response = await fetch(masterM3u8Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.sbs.com.au/'
      }
    });

    const m3u8Content = await m3u8Response.text();

    // 5. Penting untuk Akamai: Tulis ulang path relative di dalam M3U8 agar menjadi URL absolut
    // Karena token `hdnea` menempel pada query string, kita harus meneruskannya ke setiap baris chunk (.m3u8 anak)
    const urlObj = new URL(masterM3u8Url);
    const baseUrl = urlObj.origin + urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/'));
    const tokenQuery = urlObj.search; // Ini akan mengambil ?hdnea=st=...~hmac=...

    // Modifikasi isi m3u8 agar setiap sub-playlist membawa token yang sama
    const rewrittenContent = m3u8Content.replace(/^(?!#)(.+)$/mg, (match) => {
      if (match.startsWith('http')) return match;
      // Jika path relative, gabungkan dengan baseUrl dan bawa tokennya
      return `${baseUrl}/${match}${tokenQuery}`;
    });

    // 6. Lempar hasilnya ke IPTV Player
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return res.status(200).send(rewrittenContent);

  } catch (error) {
    return res.status(500).send('Wrapper Error: ' + error.message);
  }
}
