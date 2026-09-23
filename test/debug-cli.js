/**
 * Nuvio Emby Plugin - Standalone CLI Diagnostic & Debugging Tool
 * Run: node test/debug-cli.js
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const { getStreams, onSettings } = require(path.join(ROOT_DIR, "src", "emby.js"));

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m"
};

function logHeader(title) {
  console.log(`\n${COLORS.bright}${COLORS.cyan}====================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan} ${title}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}====================================================${COLORS.reset}`);
}

function logPass(msg) {
  console.log(`${COLORS.green}  ✓ [GEÇTİ]${COLORS.reset} ${msg}`);
}

function logFail(msg, error) {
  console.log(`${COLORS.red}  ✗ [BAŞARISIZ]${COLORS.reset} ${msg}`);
  if (error) console.log(`    ${COLORS.yellow}Detay:${COLORS.reset} ${error.message || error}`);
}

function logInfo(msg) {
  console.log(`${COLORS.blue}  ℹ [BİLGİ]${COLORS.reset} ${msg}`);
}

async function runDiagnostics() {
  console.log(`${COLORS.bright}Nuvio Emby Eklentisi - Tam Teşhis ve Hata Ayıklama Aracı${COLORS.reset}`);
  console.log(`Tarih: ${new Date().toLocaleString()}`);

  let allPassed = true;

  // ----------------------------------------------------
  // 1. MANIFEST VE DOSYA KONTROLÜ
  // ----------------------------------------------------
  logHeader("1. Yerel Dosya ve Manifest Kontrolleri");
  try {
    const manifestPath = path.join(ROOT_DIR, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      throw new Error("manifest.json dosyası bulunamadı!");
    }
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    logPass(`manifest.json geçerli JSON (Sürüm: ${manifestContent.version})`);

    const scraper = manifestContent.scrapers?.[0];
    if (!scraper) throw new Error("Manifest içinde scraper tanımlanmamış!");
    
    logPass(`Scraper ID: '${scraper.id}', Dosya: '${scraper.filename}'`);

    const providerFile = path.join(ROOT_DIR, scraper.filename);
    if (!fs.existsSync(providerFile)) {
      throw new Error(`Scraper hedef dosyası bulunamadı: ${scraper.filename}`);
    }
    logPass(`Hedef dosya mevcut: ${scraper.filename} (${(fs.statSync(providerFile).size / 1024).toFixed(1)} KB)`);
  } catch (err) {
    logFail("Manifest kontrolü başarısız", err);
    allPassed = false;
  }

  // ----------------------------------------------------
  // 2. EMBY SUNUCU BAĞLANTISI VE OTURUM AÇMA
  // ----------------------------------------------------
  logHeader("2. Emby Sunucusu Bağlantı ve Giriş Testi");
  const serverUrl = process.env.EMBY_SERVER_URL || "";
  const username = process.env.EMBY_USERNAME || "";
  const password = process.env.EMBY_PASSWORD || "";
  let token = null;
  let userId = null;

  if (!serverUrl || !username) {
    logInfo("EMBY_SERVER_URL veya EMBY_USERNAME ortam değişkeni tanımlanmamış.");
    logInfo("Canlı CLI testi için komut satırından çalıştırın: EMBY_SERVER_URL=... EMBY_USERNAME=... EMBY_PASSWORD=... node test/debug-cli.js");
    return;
  }

  try {
    logInfo(`Sunucuya bağlanılıyor: ${serverUrl}`);
    const authRes = await fetch(`${serverUrl}/emby/Users/AuthenticateByName`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Emby-Authorization": 'MediaBrowser Client="NuvioDebug", Device="CLI", DeviceId="debug-cli", Version="3.1.0"'
      },
      body: JSON.stringify({ Username: username, Pw: password })
    });

    if (!authRes.ok) {
      throw new Error(`HTTP ${authRes.status}: ${authRes.statusText}`);
    }

    const authData = await authRes.json();
    token = authData.AccessToken;
    userId = authData.User?.Id;

    logPass(`Emby ile oturum açıldı: Kullanıcı '${authData.User?.Name}' (ID: ${userId})`);
    logPass(`Erişim Jetonu (AccessToken): ${token.slice(0, 8)}...${token.slice(-6)}`);
    logPass(`Sunucu ID: ${authData.ServerId}`);
  } catch (err) {
    logFail("Emby oturum açma başarısız", err);
    allPassed = false;
  }

  if (!token || !userId) {
    console.log(`\n${COLORS.red}Oturum açılamadığı için sonraki testler atlanıyor.${COLORS.reset}`);
    return;
  }

  // ----------------------------------------------------
  // 3. KÜTÜPHANE ÖZETİ
  // ----------------------------------------------------
  logHeader("3. Emby Kütüphane İstatistikleri");
  try {
    const moviesRes = await fetch(`${serverUrl}/emby/Users/${userId}/Items?IncludeItemTypes=Movie&Recursive=true&Limit=1&api_key=${token}`);
    const moviesData = await moviesRes.json();
    logPass(`Kütüphanedeki Toplam Film Sayısı: ${moviesData.TotalRecordCount?.toLocaleString() || "Bilinmiyor"}`);

    const seriesRes = await fetch(`${serverUrl}/emby/Users/${userId}/Items?IncludeItemTypes=Series&Recursive=true&Limit=1&api_key=${token}`);
    const seriesData = await seriesRes.json();
    logPass(`Kütüphanedeki Toplam Dizi Sayısı: ${seriesData.TotalRecordCount?.toLocaleString() || "Bilinmiyor"}`);
  } catch (err) {
    logFail("Kütüphane istatistikleri alınamadı", err);
  }

  // ----------------------------------------------------
  // 4. getStreams İLE MEDYA AKIŞI ÜRETME TESTLERİ
  // ----------------------------------------------------
  logHeader("4. Nuvio getStreams Gerçek Çağrı Testleri");

  // Test 4A: Film (Fight Club - 550)
  try {
    logInfo("Test 4A: Film (TMDB ID: 550 - Fight Club)");
    const streams = await getStreams(550, "movie");
    if (!streams || streams.length === 0 || streams[0].quality === "HATA" || streams[0].quality === "BİLGİ") {
      throw new Error(`Akış bulunamadı: ${JSON.stringify(streams[0] || {})}`);
    }
    logPass(`${streams.length} adet doğrudan akış (Direct Play) bulundu`);
    logInfo(`  Örnek Akış: ${streams[0].name} | ${streams[0].title}`);
    logInfo(`  URL: ${streams[0].url.slice(0, 70)}...`);
    if (streams[0].subtitles?.length) {
      logPass(`  Altyazı Desteği: ${streams[0].subtitles.length} adet altyazı mevcut`);
    }
  } catch (err) {
    logFail("Test 4A Başarısız", err);
    allPassed = false;
  }

  // Test 4B: IMDb ID ile Arama (tt0137523)
  try {
    logInfo("Test 4B: IMDb ID ile Film (tt0137523)");
    const streams = await getStreams("tt0137523", "movie");
    if (!streams || streams.length === 0 || streams[0].quality === "HATA") {
      throw new Error("IMDb ID ile akış üretilemedi");
    }
    logPass(`IMDb araması başarılı: ${streams.length} akış bulundu`);
  } catch (err) {
    logFail("Test 4B Başarısız", err);
    allPassed = false;
  }

  // Test 4C: Stremio Prefiksli ID ile Film (tmdb:550)
  try {
    logInfo("Test 4C: Prefiksli ID (tmdb:550)");
    const streams = await getStreams("tmdb:550", "movie");
    if (!streams || streams.length === 0 || streams[0].quality === "HATA") {
      throw new Error("Prefiksli ID çözümlenemedi");
    }
    logPass(`Prefiksli ID başarıyla çözüldü: ${streams.length} akış`);
  } catch (err) {
    logFail("Test 4C Başarısız", err);
    allPassed = false;
  }

  // Test 4D: Dizi ve Bölüm Arama (Breaking Bad - 1396 S01E01)
  try {
    logInfo("Test 4D: Dizi (TMDB: 1396, S1, E1 - Breaking Bad)");
    const streams = await getStreams("1396", "tv", 1, 1);
    if (!streams || streams.length === 0 || streams[0].quality === "HATA") {
      throw new Error("Dizi bölümü bulunamadı");
    }
    logPass(`Dizi bölümü akışları: ${streams.length} adet akış üretildi`);
    logInfo(`  Örnek: ${streams[0].name} | ${streams[0].title}`);
  } catch (err) {
    logFail("Test 4D Başarısız", err);
    allPassed = false;
  }

  // Test 4E: Stremio Kolon Formatlı Dizi ID (tt0903747:1:1)
  try {
    logInfo("Test 4E: Stremio Kolon Formatı (tt0903747:1:1)");
    const streams = await getStreams("tt0903747:1:1", "tv");
    if (!streams || streams.length === 0 || streams[0].quality === "HATA") {
      throw new Error("Stremio kolon formatlı dizi çözümlenemedi");
    }
    logPass(`Stremio kolon formatı başarıyla çözüldü: ${streams.length} akış`);
  } catch (err) {
    logFail("Test 4E Başarısız", err);
    allPassed = false;
  }

  // ----------------------------------------------------
  // 5. AKIŞ HTTP ERİŞİLEBİLİRLİK DOĞRULAMASI
  // ----------------------------------------------------
  logHeader("5. Akış URL'si HTTP Yanıt Doğrulaması (Canlı Test)");
  try {
    const streams = await getStreams(550, "movie");
    const testUrl = streams[0]?.url;
    if (!testUrl) throw new Error("Test edilecek akış URL'si bulunamadı");

    logInfo("Akış başlığı (Range: bytes=0-1024) sorgulanıyor...");
    const streamRes = await fetch(testUrl, {
      method: "GET",
      headers: {
        "Range": "bytes=0-1024",
        "X-Emby-Token": token
      }
    });

    if (streamRes.status === 200 || streamRes.status === 206) {
      logPass(`Emby video akış sunucusu canlı yanıt verdi! (HTTP ${streamRes.status})`);
      logPass(`İçerik Türü (Content-Type): ${streamRes.headers.get("content-type") || "video/mp4"}`);
      logPass(`Kabul Edilen Aralık (Accept-Ranges): ${streamRes.headers.get("accept-ranges") || "bytes"}`);
    } else {
      throw new Error(`Sunucu beklenmeyen durum döndürdü: HTTP ${streamRes.status}`);
    }
  } catch (err) {
    logFail("Akış URL testi başarısız", err);
    allPassed = false;
  }

  // ----------------------------------------------------
  // SONUÇ VE REHBER
  // ----------------------------------------------------
  logHeader("TEŞHİS VE TEST SONUCU");
  if (allPassed) {
    console.log(`${COLORS.green}${COLORS.bright}✓ TÜM TESTLER BAŞARIYLA GEÇTİ!${COLORS.reset}`);
    console.log("\nNuvio İçinde Nasıl Doğrulanır:");
    console.log("1. Nuvio Ayarlar -> Yerel Kazıyıcılar (Scrapers) -> Depoyu silin ve yeniden ekleyin:");
    console.log(`   ${COLORS.cyan}https://raw.githubusercontent.com/Omc725/nuvio-emby-plugin/main/manifest.json${COLORS.reset}`);
    console.log("2. Nuvio'da 'Arama' (Search) çubuğuna 'Fight Club' veya 'Breaking Bad' yazın.");
    console.log("3. Filme tıklayın; stream seçenekleri arasında [Emby] 4K / 1080p seçenekleri belirecektir.");
  } else {
    console.log(`${COLORS.red}${COLORS.bright}Bazı testlerde sorun tespit edildi. Lütfen yukarıdaki detayları inceleyin.${COLORS.reset}`);
  }
}

runDiagnostics();
