/**
 * Nuvio Emby Media Provider (v3.5.0)
 * 
 * Direct Play provider connecting to local or remote Emby servers.
 * Features:
 *  - Sorting: Quality first (4K > 1440p > 1080p > 720p > ...), then Size/Bitrate descending.
 *  - Clean StreamBridge format matching Nuvio native badge engine.
 *  - Rich metadata: Video codec, bit depth, dynamic range (HDR10, DV), audio codecs, channels, audio & sub languages.
 *  - Real-time remote telemetry via ntfy.sh.
 *  - 100% QuickJS, Hermes and Android TV compatible (ES2016).
 */

// ==========================================
// YAPILANDIRMA / CONFIGURATION
// ==========================================
// Varsayılan değerler boştur. Sunucu adresi, kullanıcı adı ve şifre
// bilgileri Nuvio uygulamasının kendi Ayarlar (onSettings) arayüzünden girilir.
const CONFIG = {
  serverUrl: "", // Emby sunucu adresi (Nuvio Ayarlar menüsünden giriniz)
  username: "",  // Emby kullanıcı adı (Nuvio Ayarlar menüsünden giriniz)
  password: "",  // Emby kullanıcı şifresi (Nuvio Ayarlar menüsünden giriniz)
  debugMode: false,

  // Alternatif doğrudan API Key (opsiyonel)
  apiKey: "",
  userId: ""
};

// ==========================================
// CANLI UZAK LOGLAMA / REMOTE TELEMETRY
// ==========================================
const LOG_ENDPOINT = "";

/**
 * Nuvio cihazından konsol loglarını yazdırır (LOG_ENDPOINT tanımlıysa ntfy.sh'ye de gönderir).
 */
function sendRemoteLog(step, message, data) {
  try {
    const time = new Date().toLocaleTimeString("tr-TR");
    const dataStr = data !== undefined && data !== null ? ` | ${JSON.stringify(data)}` : "";
    const textMsg = `[${time}][${step}] ${message}${dataStr}`;
    console.log(`[Emby] ${textMsg}`);

    if (LOG_ENDPOINT && typeof fetch === "function") {
      fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: {
          "Title": `Nuvio Emby: ${step}`,
          "Priority": step === "ERROR" ? "high" : "default",
          "Tags": step === "ERROR" ? "warning" : (step === "INIT" ? "rocket" : "information")
        },
        body: textMsg
      }).catch(function() {});
    }
  } catch (e) {}
}

// Eklenti yüklendiğinde anında uzak log gönder
try {
  sendRemoteLog("INIT", "emby.js (v3.5.0) Nuvio ortamında başarıyla yüklendi", {
    hasGlobalThis: typeof globalThis !== "undefined",
    hasSettings: typeof globalThis !== "undefined" && Boolean(globalThis.SCRAPER_SETTINGS)
  });
} catch (e) {}

// Kimlik doğrulama önbelleği (her istekte tekrar giriş yapmamak için)
let authCache = {
  serverUrl: "",
  username: "",
  password: "",
  accessToken: "",
  userId: "",
  timestamp: 0
};

// ==========================================
// YARDIMCI SABİTLER VE DİL HARİTASI
// ==========================================
const TMDB_PUBLIC_API_KEY = "439c478a771f35c05022f9feabcca01c";

const LANG_MAP = {
  tur: "tr",
  eng: "en",
  fre: "fr",
  fra: "fr",
  ger: "de",
  deu: "de",
  spa: "es",
  ita: "it",
  por: "pt",
  rus: "ru",
  ara: "ar",
  jpn: "ja",
  kor: "ko",
  chi: "zh",
  zho: "zh",
  dut: "nl",
  nld: "nl",
  pol: "pl",
  swe: "sv",
  nor: "no",
  dan: "da",
  fin: "fi",
  ell: "el",
  gre: "el",
  heb: "he",
  hin: "hi",
  hun: "hu",
  ind: "id",
  ron: "ro",
  rum: "ro",
  ukr: "uk",
  vie: "vi",
  aze: "az",
  bul: "bg",
  ces: "cs",
  cze: "cs"
};

// Nuvio V2 Anlık Rozet (Instant Badge) Görünmez Unicode İşaretleyicileri
const V2_MARKERS = {
  res: {
    "4K": "\u2063\u200C\u200C\u200C\u200D\u200D\u200C\u200C\u200D\u2064",
    "2160p": "\u2063\u200C\u200C\u200C\u200D\u200D\u200C\u200C\u200D\u2064",
    "1440p": "\u2063\u200C\u200C\u200C\u200D\u200D\u200C\u200D\u200C\u2064",
    "1080p": "\u2063\u200C\u200C\u200C\u200D\u200D\u200C\u200D\u200D\u2064",
    "720p": "\u2063\u200C\u200C\u200C\u200D\u200D\u200D\u200C\u200C\u2064",
    "480p": "\u2063\u200C\u200C\u200C\u200D\u200D\u200D\u200D\u200C\u2064"
  },
  quality: {
    "REMUX": "\u2063\u200C\u200C\u200D\u200C\u200C\u200C\u200D\u200C\u2064",
    "BluRay": "\u2063\u200C\u200C\u200D\u200C\u200C\u200C\u200D\u200D\u2064",
    "WEB-DL": "\u2063\u200C\u200C\u200D\u200C\u200C\u200D\u200C\u200C\u2064",
    "WEBRip": "\u2063\u200C\u200C\u200D\u200C\u200C\u200D\u200C\u200D\u2064",
    "HDRip": "\u2063\u200C\u200C\u200D\u200C\u200C\u200D\u200D\u200C\u2064",
    "HDTV": "\u2063\u200C\u200C\u200D\u200C\u200D\u200C\u200C\u200D\u2064"
  },
  visual: {
    "DV": "\u2063\u200C\u200C\u200C\u200C\u200C\u200C\u200C\u200C\u200D\u2064",
    "HDR10+": "\u2063\u200C\u200C\u200C\u200C\u200C\u200C\u200D\u200C\u2064",
    "HDR10": "\u2063\u200C\u200C\u200C\u200C\u200C\u200C\u200D\u200D\u2064",
    "HDR": "\u2063\u200C\u200C\u200C\u200C\u200C\u200D\u200C\u200C\u2064",
    "10bit": "\u2063\u200C\u200C\u200C\u200C\u200C\u200D\u200D\u200C\u2064",
    "SDR": "\u2063\u200C\u200C\u200C\u200C\u200C\u200D\u200D\u200D\u2064",
    "HLG": "\u2063\u200C\u200C\u200C\u200C\u200C\u200D\u200C\u200D\u2064"
  },
  codec: {
    "HEVC": "\u2063\u200C\u200C\u200D\u200C\u200D\u200D\u200D\u200D\u2064",
    "AVC": "\u2063\u200C\u200C\u200D\u200D\u200C\u200C\u200C\u200C\u2064",
    "AV1": "\u2063\u200C\u200C\u200D\u200C\u200D\u200D\u200D\u200C\u2064",
    "XviD": "\u2063\u200C\u200C\u200D\u200D\u200C\u200C\u200C\u200D\u2064"
  },
  audio: {
    "TrueHD Atmos": "\u2063\u200C\u200C\u200C\u200D\u200C\u200C\u200C\u200D\u2064\u2063\u200C\u200C\u200C\u200C\u200D\u200C\u200C\u200D\u2064",
    "Atmos": "\u2063\u200C\u200C\u200C\u200C\u200D\u200C\u200C\u200D\u2064",
    "TrueHD": "\u2063\u200C\u200C\u200C\u200D\u200C\u200C\u200C\u200D\u2064",
    "DTS-HD MA": "\u2063\u200C\u200C\u200C\u200C\u200D\u200D\u200C\u200D\u2064",
    "DTS:X": "\u2063\u200C\u200C\u200C\u200C\u200D\u200D\u200C\u200C\u2064",
    "DTS": "\u2063\u200C\u200C\u200C\u200D\u200C\u200C\u200C\u200C\u2064",
    "DD+": "\u2063\u200C\u200C\u200C\u200C\u200D\u200C\u200D\u200C\u2064",
    "DD": "\u2063\u200C\u200C\u200C\u200C\u200D\u200C\u200D\u200D\u2064",
    "AC3": "\u2063\u200C\u200C\u200C\u200C\u200D\u200C\u200D\u200D\u2064",
    "AAC": "\u2063\u200C\u200C\u200C\u200D\u200C\u200C\u200D\u200D\u2064",
    "FLAC": "\u2063\u200C\u200C\u200C\u200D\u200C\u200D\u200C\u200C\u2064",
    "OPUS": "\u2063\u200C\u200C\u200C\u200D\u200C\u200C\u200D\u200C\u2064"
  },
  channels: {
    "7.1": "\u2063\u200C\u200C\u200C\u200D\u200C\u200D\u200C\u200D\u2064",
    "6.1": "\u2063\u200C\u200C\u200C\u200D\u200C\u200D\u200D\u200C\u2064",
    "5.1": "\u2063\u200C\u200C\u200C\u200D\u200C\u200D\u200D\u200D\u2064",
    "2.0": "\u2063\u200C\u200C\u200C\u200D\u200D\u200C\u200C\u200C\u2064"
  },
  lang: {
    "TR": "\u2063\u2062\u200D\u2060\u2060\u200C\u2064",
    "EN": "\u2063\u2062\u2060\u200C\u200C\u200C\u2064",
    "FR": "\u2063\u2062\u200C\u200C\u200D\u200C\u2064",
    "DE": "\u2063\u2062\u200D\u200C\u200D\u200C\u2064",
    "ES": "\u2063\u2062\u2060\u2060\u200C\u200C\u2064",
    "IT": "\u2063\u2062\u2060\u200C\u200D\u200C\u2064",
    "RU": "\u2063\u2062\u2060\u200D\u200C\u200C\u2064"
  }
};

/**
 * Aktif yapılandırmayı döndürür.
 * Nuvio'nun cihaz üzerindeki yerel ayarlarını (SCRAPER_SETTINGS) önceliklendirir.
 */
function getActiveConfig() {
  const dynamic = (typeof globalThis !== "undefined" && globalThis.SCRAPER_SETTINGS)
    ? globalThis.SCRAPER_SETTINGS
    : {};

  const serverUrl = (dynamic.serverUrl !== undefined && dynamic.serverUrl !== "") ? dynamic.serverUrl : CONFIG.serverUrl;
  const username = (dynamic.username !== undefined && dynamic.username !== "") ? dynamic.username : CONFIG.username;
  const password = (dynamic.password !== undefined && dynamic.password !== "") ? dynamic.password : CONFIG.password;
  const debugMode = dynamic.debugMode !== undefined ? Boolean(dynamic.debugMode) : CONFIG.debugMode;

  let apiKey = (dynamic.apiKey !== undefined && dynamic.apiKey !== "") ? dynamic.apiKey : CONFIG.apiKey;
  let userId = (dynamic.userId !== undefined && dynamic.userId !== "") ? dynamic.userId : CONFIG.userId;

  // Kullanıcı adı tanımlıysa (CONFIG veya dynamic), her zaman oturum açma token'ı kullanılmalıdır.
  if (username) {
    apiKey = "";
    userId = "";
  }

  return {
    serverUrl: serverUrl || "",
    username: username || "",
    password: password || "",
    apiKey: apiKey || "",
    userId: userId || "",
    debugMode: Boolean(debugMode)
  };
}

/**
 * Sunucu URL'sini sanitize eder.
 */
function sanitizeUrl(url) {
  if (!url) return "";
  let clean = String(url).trim().replace(/\/+$/, "");
  clean = clean.replace(/\/emby\/?$/i, "");
  if (!/^https?:\/\//i.test(clean)) {
    clean = `http://${clean}`;
  }
  return clean.replace(/\/+$/, "");
}

/**
 * Dil kodunu 2 harfli ISO 639-1 formatına indirger.
 */
function normalizeLanguage(lang) {
  if (!lang) return "und";
  const clean = String(lang).toLowerCase().trim();
  if (clean.length === 2) return clean;
  if (LANG_MAP[clean]) return LANG_MAP[clean];
  if (clean.length === 3) return clean.substring(0, 2);
  return clean;
}

/**
 * Ülke/Dil bayrak emojisini döndürür.
 */
function getLangFlag(lang) {
  const code = normalizeLanguage(lang).toLowerCase();
  const flags = {
    tr: "🇹🇷",
    en: "🇬🇧",
    fr: "🇫🇷",
    de: "🇩🇪",
    es: "🇪🇸",
    it: "🇮🇹",
    ru: "🇷🇺",
    ja: "🇯🇵",
    ko: "🇰🇷",
    zh: "🇨🇳",
    ar: "🇸🇦",
    pt: "🇵🇹",
    nl: "🇳🇱",
    pl: "🇵🇱",
    sv: "🇸🇪",
    no: "🇳🇴",
    da: "🇩🇰",
    fi: "🇫🇮",
    el: "🇬🇷",
    he: "🇮🇱",
    hi: "🇮🇳",
    hu: "🇭🇺",
    id: "🇮🇩",
    ro: "🇷🇴",
    uk: "🇺🇦",
    vi: "🇻🇳",
    az: "🇦🇿",
    bg: "🇧🇬",
    cs: "🇨🇿"
  };
  return flags[code] || "🌐";
}

/**
 * Gelen ID ve Sezon/Bölüm parametrelerini ayrıştırır.
 */
function parseInputId(id, season, episode) {
  let raw = "";
  let parsedSeason = (season !== undefined && season !== null && season !== "") ? Number(season) : undefined;
  let parsedEpisode = (episode !== undefined && episode !== null && episode !== "") ? Number(episode) : undefined;

  if (typeof id === "object" && id !== null) {
    raw = id.id || id.tmdbId || id.tmdb_id || id.imdbId || id.imdb_id || id.mediaId || id.title || "";
    if (parsedSeason === undefined && (id.season !== undefined || id.seasonNumber !== undefined)) {
      parsedSeason = Number(id.season !== undefined ? id.season : id.seasonNumber);
    }
    if (parsedEpisode === undefined && (id.episode !== undefined || id.episodeNumber !== undefined)) {
      parsedEpisode = Number(id.episode !== undefined ? id.episode : id.episodeNumber);
    }
  } else {
    raw = String(id || "").trim();
  }

  // Stremio kolon formatı ayrıştırması
  if (raw.includes(":")) {
    const parts = raw.split(":");
    const firstPart = parts[0].toLowerCase();
    if (firstPart === "tmdb" || firstPart === "imdb" || firstPart === "movie" || firstPart === "tv" || firstPart === "series") {
      parts.shift();
    }
    if (parts.length >= 3) {
      raw = parts[0];
      if (parsedSeason === undefined || isNaN(parsedSeason)) parsedSeason = Number(parts[1]);
      if (parsedEpisode === undefined || isNaN(parsedEpisode)) parsedEpisode = Number(parts[2]);
    } else if (parts.length === 2) {
      raw = parts[0];
      if (parsedSeason === undefined || isNaN(parsedSeason)) parsedSeason = Number(parts[1]);
    } else if (parts.length === 1) {
      raw = parts[0];
    }
  }

  raw = raw.replace(/^(tmdb|imdb|movie|tv|series):/i, "").trim();
  const isImdb = /^tt\d+/i.test(raw);

  return {
    cleanId: raw,
    season: parsedSeason,
    episode: parsedEpisode,
    isImdb
  };
}

/**
 * Video akış çözünürlüğünü StreamBridge standartlarına uygun olarak tespit eder.
 */
function getQualityTag(videoStream) {
  if (!videoStream) return "Unknown";
  const height = Number(videoStream.Height) || 0;
  const width = Number(videoStream.Width) || 0;
  const displayTitle = videoStream.DisplayTitle || "";

  const resolutionMatch = displayTitle.match(/\b(\d+k|4k|2160p|1440p|1080p|720p|576p|480p|sd)\b/i);
  if (resolutionMatch) {
    const resolution = resolutionMatch[1].toUpperCase();
    if (resolution.includes("4K") || resolution.includes("2160")) return "4K";
    if (resolution.includes("1440")) return "1440p";
    if (resolution.includes("1080")) return "1080p";
    if (resolution.includes("720")) return "720p";
    if (resolution.includes("576")) return "576p";
    if (resolution.includes("480")) return "480p";
    if (resolution.includes("SD")) return "SD";
  }

  if (!width && !height) return "Unknown";

  if (width >= 3840 || height >= 2160) {
    if (width >= 4096) return "4K DCI";
    if (width >= 3840) return "4K";
    return "2160p";
  }

  if (height >= 1440) return "1440p";
  if (height >= 1080) return "1080p";
  if (height >= 720) return "720p";
  if (height >= 576) return "576p";
  if (height >= 480) return "480p";

  return "SD";
}

/**
 * Geriye dönük uyumluluk için rank ve p içeren kalite bilgisi.
 */
function detectQuality(videoStream) {
  const q = getQualityTag(videoStream);
  const resOrder = {
    "4K DCI": 100, "4K": 100, "2160p": 100, "1440p": 80, "1080p": 60,
    "720p": 40, "576p": 30, "480p": 20, "360p": 15, "SD": 10, "Unknown": 10
  };
  return {
    quality: q,
    p: videoStream && videoStream.Height ? `${videoStream.Height}p` : q,
    rank: resOrder[q] || 60
  };
}

/**
 * Çözünürlük boyutlarını (genişlik x yükseklik) döndürür.
 */
function getResolutionDimensions(videoStream) {
  if (!videoStream) return null;
  const width = videoStream.Width;
  const height = videoStream.Height;
  if (width && height) {
    return `${width}x${height}`;
  }
  return null;
}

/**
 * Video Codec ve profil bilgisini döndürür (HEVC 10bit, H.264 vb.).
 */
function getVideoTag(videoStream) {
  if (!videoStream) return "";
  const codec = (videoStream.Codec || "").toUpperCase();
  const profile = videoStream.Profile || "";
  const codecMap = {
    "H264": "H.264",
    "AVC": "H.264",
    "H265": "HEVC",
    "HEVC": "HEVC",
    "VP8": "VP8",
    "VP9": "VP9",
    "AV1": "AV1",
    "MPEG2VIDEO": "MPEG-2",
    "VC1": "VC-1",
    "MPEG4": "MPEG-4",
    "XVID": "XviD"
  };
  const displayCodec = codecMap[codec] || codec || "";
  if (profile && ["Main10", "High10", "Main 10"].some(p => profile.includes(p))) {
    return `${displayCodec} 10bit`;
  }
  if (Number(videoStream.BitDepth) >= 10 && !displayCodec.includes("10bit")) {
    return `${displayCodec} 10bit`;
  }
  return displayCodec;
}

/**
 * HDR / Dolby Vision formatını tespit eder.
 */
function getHdrTag(videoStream) {
  if (!videoStream) return null;
  switch (videoStream.ExtendedVideoType) {
    case "Hdr10": return "HDR10";
    case "Hdr10Plus": return "HDR10+";
    case "HyperLogGamma": return "HLG";
    case "DolbyVision": return "DV";
    default: break;
  }
  if (videoStream.ColorTransfer === "smpte2084") return "HDR10";
  if (videoStream.ColorTransfer === "arib-std-b67") return "HLG";

  const raw = String(videoStream.VideoRange || "").toUpperCase();
  if (raw.includes("DOVI") || raw.includes("DOLBY VISION") || raw.includes("DV")) return "DV";
  if (raw.includes("HDR10+") || raw.includes("HDR 10+")) return "HDR10+";
  if (raw.includes("HDR10") || raw.includes("HDR 10")) return "HDR10";
  if (raw.includes("HDR")) return "HDR";
  if (raw.includes("HLG")) return "HLG";

  if (videoStream.IsHDR === true) return "HDR";
  return null;
}

/**
 * Ses kanalı ve format bilgisini StreamBridge standartlarında formatlar (DD+ 5.1, DD 2.0 vb.).
 */
function getAudioTag(audioStream) {
  if (!audioStream) return "";
  const codec = (audioStream.Codec || "").toUpperCase();
  const channels = audioStream.Channels;
  const title = (audioStream.DisplayTitle || "").toUpperCase();

  const codecMap = {
    "AAC": "AAC",
    "AC3": "DD",
    "EAC3": "DD+",
    "DTS": "DTS",
    "DTSHD": "DTS-HD",
    "TRUEHD": "TrueHD",
    "FLAC": "FLAC",
    "OPUS": "Opus",
    "MP3": "MP3",
    "VORBIS": "Vorbis",
    "PCM": "PCM"
  };

  let displayCodec = codecMap[codec] || codec || "Unknown";
  if (codec === "DTS" && (title.includes("DTS-HD") || title.includes("MA") || title.includes("MASTER"))) {
    displayCodec = "DTS-HD MA";
  } else if (codec === "DTS" && title.includes("DTS:X")) {
    displayCodec = "DTS:X";
  }
  if (title.includes("ATMOS")) {
    displayCodec = `${displayCodec} Atmos`;
  }

  let channelStr = "";
  if (channels === 1) channelStr = "Mono";
  else if (channels === 2) channelStr = "2.0";
  else if (channels === 6) channelStr = "5.1";
  else if (channels === 8) channelStr = "7.1";
  else if (channels) channelStr = `${channels}ch`;

  return channelStr ? `${displayCodec} ${channelStr}` : displayCodec;
}

/**
 * Dosyanın bir REMUX olup olmadığını tespit eder.
 */
function isRemux(source) {
  if (!source) return false;
  const path = (source.Path || "").toLowerCase();
  const name = (source.Name || "").toLowerCase();
  return path.includes("remux") || name.includes("remux");
}

/**
 * Bitrate değerini StreamBridge formatında (12.9Mbps) üretir.
 */
function formatBitrate(bps) {
  if (!bps || bps === 0) return null;
  const mbps = (Number(bps) / 1000000).toFixed(1);
  return `${mbps}Mbps`;
}

/**
 * Dosya boyutunu StreamBridge formatında (14.2GB) üretir.
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return null;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = Number(bytes);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  const decimals = unitIndex >= 3 ? 1 : 0;
  return `${size.toFixed(decimals)}${units[unitIndex]}`;
}

function formatBytes(bytes) {
  return formatFileSize(bytes) || "";
}

/**
 * StreamBridge ile %100 uyumlu 4-5 satırlık zengin kart açıklaması oluşturur.
 * Nuvio bu formatı ayrıştırarak alt kısımdaki yerel rozetleri ([4K], [HEVC], [BOYUT 14.2 GB]) çizer.
 */
function buildStreamDescription(mediaInfo) {
  const lines = [];

  // 1. Satır: Çözünürlük • Boyutlar (Örn: 4K • 3840x1596)
  const resolutionLine = [];
  if (mediaInfo.qualityTag && mediaInfo.qualityTag !== "Unknown") {
    resolutionLine.push(mediaInfo.qualityTag);
  }
  if (mediaInfo.resolutionDimensions) {
    resolutionLine.push(mediaInfo.resolutionDimensions);
  }
  if (resolutionLine.length > 0) {
    lines.push(resolutionLine.join(" • "));
  }

  // 2. Satır: HDR/DV • Video Codec (Örn: DV • HEVC 10bit veya HEVC 10bit)
  const typeLine = [];
  if (mediaInfo.hdrTag) {
    typeLine.push(mediaInfo.hdrTag);
  }
  if (mediaInfo.videoTag) {
    typeLine.push(mediaInfo.videoTag);
  }
  if (typeLine.length > 0) {
    lines.push(typeLine.join(" • "));
  }

  // 3. Satır: REMUX (varsa)
  if (mediaInfo.isRemux) {
    lines.push("REMUX");
  }

  // 4. Satır: Ses Formatı (Örn: DD+ 5.1 veya DD 2.0)
  if (mediaInfo.audioTag) {
    lines.push(mediaInfo.audioTag);
  }

  // 5. Satır: Kapsayıcı • Bitrate • Boyut (Örn: MKV • 12.9Mbps • 14.2GB)
  const fileLine = [];
  if (mediaInfo.container) {
    fileLine.push(mediaInfo.container);
  }
  if (mediaInfo.bitrateFormatted) {
    fileLine.push(mediaInfo.bitrateFormatted);
  }
  if (mediaInfo.sizeFormatted) {
    fileLine.push(mediaInfo.sizeFormatted);
  }
  if (fileLine.length > 0) {
    lines.push(fileLine.join(" • "));
  }

  return lines.join("\n") || "Stream Available";
}

/**
 * Medya kaynağından altyazıları ayıklar.
 */
function extractSubtitles(serverUrl, itemId, source, apiKey) {
  const subtitles = [];
  if (!source || !Array.isArray(source.MediaStreams)) return subtitles;

  for (let i = 0; i < source.MediaStreams.length; i++) {
    const stream = source.MediaStreams[i];
    if (stream.Type !== "Subtitle") continue;

    const codec = (stream.Codec || "").toLowerCase();
    const isWebFormat = /^(subrip|srt|vtt|webvtt)$/i.test(codec);
    const isExternal = Boolean(stream.IsExternal);

    if (isExternal || isWebFormat) {
      const subIndex = stream.Index !== undefined ? stream.Index : i;
      const langRaw = stream.Language || "und";
      const lang = normalizeLanguage(langRaw);
      const title = stream.DisplayTitle || stream.Title || stream.Language || "Subtitle";
      const isForced = Boolean(stream.IsForced);
      const isDefault = Boolean(stream.IsDefault);

      let label = title;
      if (isForced) label += " [Forced]";
      if (isDefault) label += " [Varsayılan]";

      let subUrl = "";
      if (stream.DeliveryUrl) {
        subUrl = stream.DeliveryUrl.startsWith("http")
          ? stream.DeliveryUrl
          : `${serverUrl}${stream.DeliveryUrl}`;
      } else if (stream.IsExternal && stream.Path) {
        subUrl = `${serverUrl}/emby/Videos/${itemId}/${source.Id}/Subtitles/${subIndex}/Stream.${stream.Codec || "vtt"}?api_key=${encodeURIComponent(apiKey)}`;
      } else {
        subUrl = `${serverUrl}/emby/Videos/${itemId}/${source.Id}/Subtitles/${subIndex}/Stream.vtt?api_key=${encodeURIComponent(apiKey)}`;
      }

      if (subUrl) {
        subtitles.push({
          url: subUrl,
          lang,
          label
        });
      }
    }
  }

  return subtitles;
}

// ==========================================
// EMBY API İSTEMCİ METOTLARI
// ==========================================

/**
 * Kullanıcı adı ve şifre ile Emby sunucusunda oturum açar.
 */
async function authenticateEmby(serverUrl, username, password, logFn) {
  const now = Date.now();
  if (
    authCache.accessToken &&
    authCache.userId &&
    authCache.serverUrl === serverUrl &&
    authCache.username === username &&
    authCache.password === password &&
    now - authCache.timestamp < 12 * 60 * 60 * 1000
  ) {
    if (logFn) logFn("Oturum: Önbellekten kullanıldı");
    return {
      apiKey: authCache.accessToken,
      userId: authCache.userId
    };
  }

  const authHeader = 'MediaBrowser Client="Nuvio", Device="Nuvio Player", DeviceId="nuvio-emby-player", Version="3.5.0"';
  const endpoints = [
    `${serverUrl}/emby/Users/AuthenticateByName`,
    `${serverUrl}/Users/AuthenticateByName`
  ];

  for (const url of endpoints) {
    try {
      if (logFn) logFn(`Giriş yapılıyor (${username})...`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Emby-Authorization": authHeader,
          "Authorization": authHeader
        },
        body: JSON.stringify({
          Username: String(username).trim(),
          Pw: password ? String(password) : ""
        })
      });

      if (!res.ok) {
        if (logFn) logFn(`Giriş başarısız: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      if (!data || !data.AccessToken || !data.User || !data.User.Id) {
        if (logFn) logFn("Giriş yanıtında AccessToken veya User.Id bulunamadı");
        continue;
      }

      authCache = {
        serverUrl,
        username,
        password,
        accessToken: data.AccessToken,
        userId: data.User.Id,
        timestamp: now
      };

      if (logFn) logFn(`Giriş başarılı: ${data.User.Name || username}`);
      return {
        apiKey: data.AccessToken,
        userId: data.User.Id
      };
    } catch (err) {
      if (logFn) logFn(`Giriş hatası: ${err.message || err}`);
    }
  }

  return null;
}

/**
 * TMDB API'den film veya dizi başlığını alır.
 */
async function fetchTmdbMetadata(cleanId, isImdb, isTv) {
  try {
    if (isImdb) {
      const url = `https://api.themoviedb.org/3/find/${cleanId}?external_source=imdb_id&api_key=${TMDB_PUBLIC_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const match = (isTv ? data.tv_results?.[0] : data.movie_results?.[0]) || data.movie_results?.[0] || data.tv_results?.[0];
      if (!match) return null;
      return {
        tmdbId: match.id ? String(match.id) : null,
        title: match.title || match.name || "",
        originalTitle: match.original_title || match.original_name || "",
        year: (match.release_date || match.first_air_date || "").split("-")[0] || null
      };
    } else if (/^\d+$/.test(cleanId)) {
      const endpoint = isTv ? "tv" : "movie";
      const url = `https://api.themoviedb.org/3/${endpoint}/${cleanId}?api_key=${TMDB_PUBLIC_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        tmdbId: cleanId,
        imdbId: data.imdb_id || (data.external_ids?.imdb_id) || null,
        title: data.title || data.name || "",
        originalTitle: data.original_title || data.original_name || "",
        year: (data.release_date || data.first_air_date || "").split("-")[0] || null
      };
    }
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Emby'de Film veya Dizi arar.
 */
async function searchEmbyItem(serverUrl, userId, apiKey, idInfo, preferredType, logFn) {
  const { cleanId, isImdb } = idInfo;
  if (!cleanId) return null;

  const isTv = preferredType === "Series";
  const typeFilter = preferredType ? `&IncludeItemTypes=${encodeURIComponent(preferredType)}` : "";

  sendRemoteLog("SEARCH_START", `Arama başlatıldı: cleanId=${cleanId}, isImdb=${isImdb}, type=${preferredType}`);

  // 1. Strateji: Doğrudan ProviderId ile arama (AnyProviderIdEquals)
  const providerQueries = isImdb
    ? [`imdb.${cleanId},Imdb.${cleanId}`, `tmdb.${cleanId},Tmdb.${cleanId}`]
    : [`tmdb.${cleanId},Tmdb.${cleanId}`, `TheMovieDb.${cleanId}`];

  for (const q of providerQueries) {
    const url = `${serverUrl}/emby/Users/${userId}/Items?AnyProviderIdEquals=${encodeURIComponent(q)}${typeFilter}&Recursive=true&api_key=${encodeURIComponent(apiKey)}`;
    try {
      const res = await fetch(url, { headers: { "Accept": "application/json", "X-Emby-Token": apiKey } });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && Array.isArray(data.Items) && data.Items.length > 0) {
        const matched = (preferredType ? data.Items.find(i => i.Type === preferredType) : null) || data.Items[0];
        if (logFn) logFn(`ProviderId (${q}) ile bulundu: ${matched.Name} (ID: ${matched.Id})`);
        sendRemoteLog("SEARCH_FOUND", `ProviderId ile bulundu: ${matched.Name} (ID: ${matched.Id}, Type: ${matched.Type})`);
        return matched;
      }
    } catch (err) {
      if (logFn) logFn(`Arama hatası: ${err.message || err}`);
      sendRemoteLog("SEARCH_ERROR", `ProviderId arama hatası (${q}): ${err.message || err}`);
    }
  }

  // 2. Strateji: TMDB API Metadata Çözümlemesi
  sendRemoteLog("SEARCH_FALLBACK", `TMDB metadata sorgulanıyor: ${cleanId}`);
  const meta = await fetchTmdbMetadata(cleanId, isImdb, isTv);
  if (meta) {
    sendRemoteLog("TMDB_META", `TMDB metadata alındı: "${meta.title}" (${meta.year}), tmdbId=${meta.tmdbId}, imdbId=${meta.imdbId}`);

    const altQueries = [];
    if (meta.tmdbId && meta.tmdbId !== cleanId) {
      altQueries.push(`tmdb.${meta.tmdbId},Tmdb.${meta.tmdbId}`);
    }
    if (meta.imdbId && meta.imdbId !== cleanId) {
      altQueries.push(`imdb.${meta.imdbId},Imdb.${meta.imdbId}`);
    }

    for (const altQ of altQueries) {
      const url = `${serverUrl}/emby/Users/${userId}/Items?AnyProviderIdEquals=${encodeURIComponent(altQ)}${typeFilter}&Recursive=true&api_key=${encodeURIComponent(apiKey)}`;
      try {
        const res = await fetch(url, { headers: { "Accept": "application/json", "X-Emby-Token": apiKey } });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.Items) && data.Items.length > 0) {
            const matched = (preferredType ? data.Items.find(i => i.Type === preferredType) : null) || data.Items[0];
            if (logFn) logFn(`Alternatif ID (${altQ}) ile bulundu: ${matched.Name} (ID: ${matched.Id})`);
            sendRemoteLog("SEARCH_FOUND", `Alternatif ID ile bulundu: ${matched.Name} (ID: ${matched.Id})`);
            return matched;
          }
        }
      } catch (e) {}
    }

    // Başlık ile Emby'de Arama (SearchTerm)
    const titles = [meta.title, meta.originalTitle].filter(Boolean);
    for (const title of titles) {
      const url = `${serverUrl}/emby/Users/${userId}/Items?SearchTerm=${encodeURIComponent(title)}${typeFilter}&Recursive=true&api_key=${encodeURIComponent(apiKey)}`;
      try {
        const res = await fetch(url, { headers: { "Accept": "application/json", "X-Emby-Token": apiKey } });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.Items) && data.Items.length > 0) {
            const matched = (meta.year)
              ? data.Items.find(item => String(item.ProductionYear) === String(meta.year) && item.Type === preferredType)
                || data.Items.find(item => String(item.ProductionYear) === String(meta.year))
                || data.Items[0]
              : ((preferredType ? data.Items.find(i => i.Type === preferredType) : null) || data.Items[0]);

            if (logFn) logFn(`Başlık ile bulundu (${title}): ${matched.Name} (ID: ${matched.Id})`);
            sendRemoteLog("SEARCH_FOUND", `Başlık ile bulundu: ${matched.Name} (ID: ${matched.Id})`);
            return matched;
          }
        }
      } catch (e) {}
    }
  }

  // 3. Strateji: Doğrudan cleanId ile SearchTerm araması
  try {
    const url = `${serverUrl}/emby/Users/${userId}/Items?SearchTerm=${encodeURIComponent(cleanId)}${typeFilter}&Recursive=true&api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { headers: { "Accept": "application/json", "X-Emby-Token": apiKey } });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.Items) && data.Items.length > 0) {
        const matched = (preferredType ? data.Items.find(i => i.Type === preferredType) : null) || data.Items[0];
        if (logFn) logFn(`SearchTerm ile bulundu: ${matched.Name} (ID: ${matched.Id})`);
        sendRemoteLog("SEARCH_FOUND", `SearchTerm ile bulundu: ${matched.Name} (ID: ${matched.Id})`);
        return matched;
      }
    }
  } catch (e) {}

  if (logFn) logFn(`Emby'de eşleşen öğe bulunamadı (ID: ${cleanId})`);
  sendRemoteLog("SEARCH_NOT_FOUND", `Emby'de eşleşen öğe bulunamadı (ID: ${cleanId}, Type: ${preferredType})`);
  return null;
}

/**
 * Diziye ait belirli bir sezon ve bölümü bulur.
 */
async function findEpisode(serverUrl, apiKey, seriesId, season, episode, userId, logFn) {
  const targetSeason = Number(season);
  const targetEpisode = Number(episode);

  const seasonQuery = !isNaN(targetSeason) ? `Season=${targetSeason}&` : "";
  const userQuery = userId ? `UserId=${encodeURIComponent(userId)}&` : "";
  const url = `${serverUrl}/emby/Shows/${seriesId}/Episodes?${seasonQuery}${userQuery}api_key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Emby-Token": apiKey
      }
    });

    if (!res.ok) {
      if (logFn) logFn(`Bölüm listesi alınamadı: HTTP ${res.status}`);
      sendRemoteLog("EPISODE_ERROR", `Bölüm listesi alınamadı: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.Items)) {
      if (logFn) logFn("Bölüm listesi boş döndü");
      sendRemoteLog("EPISODE_NOT_FOUND", "Bölüm listesi boş döndü");
      return null;
    }

    const matchedEpisode = data.Items.find(item => {
      const epNum = Number(item.IndexNumber);
      const sNum = Number(item.ParentIndexNumber);

      const matchesEpisode = !isNaN(targetEpisode) && epNum === targetEpisode;
      const matchesSeason = isNaN(targetSeason) || isNaN(sNum) || sNum === targetSeason;

      return matchesEpisode && matchesSeason;
    });

    if (matchedEpisode) {
      if (logFn) logFn(`Bölüm bulundu: S${season}E${episode} - ${matchedEpisode.Name || "Bölüm"} (ID: ${matchedEpisode.Id})`);
      sendRemoteLog("EPISODE_FOUND", `Bölüm bulundu: S${season}E${episode} - ${matchedEpisode.Name || "Bölüm"} (ID: ${matchedEpisode.Id})`);
      return matchedEpisode;
    } else {
      if (logFn) logFn(`Bölüm eşleşmedi (Aranan S${season}E${episode})`);
      sendRemoteLog("EPISODE_NOT_FOUND", `Bölüm eşleşmedi (Aranan S${season}E${episode})`);
      return null;
    }
  } catch (err) {
    if (logFn) logFn(`Bölüm arama hatası: ${err.message || err}`);
    sendRemoteLog("EPISODE_ERROR", `Bölüm arama hatası: ${err.message || err}`);
    return null;
  }
}

/**
 * Medya öğesi için kaynakları (MediaSources) alır.
 */
async function getPlaybackInfo(serverUrl, userId, apiKey, itemId, logFn) {
  const endpoints = [
    `${serverUrl}/emby/Items/${itemId}/PlaybackInfo?api_key=${encodeURIComponent(apiKey)}&UserId=${encodeURIComponent(userId)}`,
    `${serverUrl}/emby/Users/${userId}/Items/${itemId}/PlaybackInfo?api_key=${encodeURIComponent(apiKey)}`,
    `${serverUrl}/Items/${itemId}/PlaybackInfo?api_key=${encodeURIComponent(apiKey)}&UserId=${encodeURIComponent(userId)}`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Emby-Token": apiKey
        },
        body: JSON.stringify({
          UserId: userId,
          StartTimeTicks: 0,
          IsPlayback: false,
          AutoOpenLiveStream: false
        })
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (data && Array.isArray(data.MediaSources) && data.MediaSources.length > 0) {
        if (logFn) logFn(`PlaybackInfo alındı: ${data.MediaSources.length} kaynak`);
        return data;
      }
    } catch (err) {}
  }

  // Yedek Strateji: /emby/Users/{userId}/Items/{itemId} ile doğrudan öğe çekme
  try {
    const itemUrl = `${serverUrl}/emby/Users/${userId}/Items/${itemId}?api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(itemUrl, {
      method: "GET",
      headers: { "Accept": "application/json", "X-Emby-Token": apiKey }
    });
    if (res.ok) {
      const itemData = await res.json();
      if (itemData && Array.isArray(itemData.MediaSources) && itemData.MediaSources.length > 0) {
        if (logFn) logFn(`Öğe detayından MediaSources alındı: ${itemData.MediaSources.length} kaynak`);
        return itemData;
      }
    }
  } catch (err) {}

  if (logFn) logFn("PlaybackInfo kaynak bulamadı");
  return null;
}

// ==========================================
// ANA SAĞLAYICI FONKSİYONU / GETSTREAMS
// ==========================================

/**
 * Nuvio oynatıcısı için akış bağlantılarını döndüren ana fonksiyon.
 */
async function getStreams(tmdbId, mediaType, season, episode) {
  const logs = [];
  const log = (msg) => {
    console.log(`[Emby Provider] ${msg}`);
    logs.push(msg);
  };

  let detectedMediaType = mediaType;
  if (typeof tmdbId === "object" && tmdbId !== null) {
    if (!detectedMediaType && (tmdbId.mediaType || tmdbId.type)) {
      detectedMediaType = tmdbId.mediaType || tmdbId.type;
    }
  }

  const idInfo = parseInputId(tmdbId, season, episode);
  const targetSeason = idInfo.season !== undefined ? idInfo.season : season;
  const targetEpisode = idInfo.episode !== undefined ? idInfo.episode : episode;

  log(`v3.5.0 çalıştı (ID: ${JSON.stringify(tmdbId)} -> ${idInfo.cleanId}, Tür: ${detectedMediaType}, S: ${targetSeason}, E: ${targetEpisode})`);

  sendRemoteLog("GET_STREAMS", `getStreams çağrıldı: ID=${JSON.stringify(tmdbId)} (${idInfo.cleanId})`, {
    rawId: tmdbId,
    cleanId: idInfo.cleanId,
    isImdb: idInfo.isImdb,
    mediaType: detectedMediaType,
    targetSeason,
    targetEpisode
  });

  try {
    const activeConfig = getActiveConfig();
    const serverUrl = sanitizeUrl(activeConfig.serverUrl);
    let { apiKey, userId } = activeConfig;

    if (!serverUrl) {
      log("HATA: Sunucu adresi boş!");
      sendRemoteLog("ERROR", "Sunucu adresi boş!");
      return activeConfig.debugMode ? [{
        name: "[Emby Teşhis] Sunucu Adresi Boş",
        title: "Emby ayarlarından sunucu adresinizi girin",
        url: "http://localhost",
        quality: "HATA"
      }] : [];
    }

    // Kullanıcı adı ve şifre verilmişse Emby ile otomatik oturum aç
    if (!apiKey && activeConfig.username) {
      sendRemoteLog("AUTH_START", `Giriş yapılıyor: ${activeConfig.username} -> ${serverUrl}`);
      const auth = await authenticateEmby(serverUrl, activeConfig.username, activeConfig.password, log);
      if (!auth) {
        sendRemoteLog("AUTH_FAIL", `Giriş başarısız: ${logs.slice(-2).join(" • ")}`);
        return activeConfig.debugMode ? [{
          name: "[Emby Teşhis] Giriş Başarısız",
          title: logs.slice(-2).join(" • "),
          url: serverUrl,
          quality: "HATA"
        }] : [];
      }
      apiKey = auth.apiKey;
      userId = auth.userId;
      sendRemoteLog("AUTH_SUCCESS", `Giriş başarılı: User ID ${userId}`);
    }

    if (!apiKey || !userId) {
      log("HATA: API anahtarı veya Kullanıcı ID alınamadı!");
      sendRemoteLog("AUTH_FAIL", "API anahtarı veya Kullanıcı ID alınamadı!");
      return activeConfig.debugMode ? [{
        name: "[Emby Teşhis] Yetkilendirme Başarısız",
        title: logs.slice(-2).join(" • "),
        url: serverUrl,
        quality: "HATA"
      }] : [];
    }

    if (!idInfo.cleanId) {
      log("HATA: ID parametresi boş!");
      sendRemoteLog("ERROR", "ID parametresi boş!");
      return [];
    }

    // Dizi mi yoksa Film mi olduğunu belirle
    let isTv = detectedMediaType === "tv" || detectedMediaType === "series" || detectedMediaType === "show";
    if (!isTv && (targetSeason !== undefined || targetEpisode !== undefined)) {
      isTv = true;
    }

    let targetItemId = null;
    let matchedItemName = "";
    let matchedItemYear = "";

    if (isTv) {
      const seasonNum = targetSeason !== undefined ? targetSeason : 1;
      const episodeNum = targetEpisode !== undefined ? targetEpisode : 1;

      // 1. Önce Dizi olarak ara
      let seriesItem = await searchEmbyItem(serverUrl, userId, apiKey, idInfo, "Series", log);

      // Bulunamazsa Film olarak da kontrol et
      if (!seriesItem) {
        const movieFallback = await searchEmbyItem(serverUrl, userId, apiKey, idInfo, "Movie", log);
        if (movieFallback) {
          targetItemId = movieFallback.Id;
          matchedItemName = movieFallback.Name || "Film";
          matchedItemYear = movieFallback.ProductionYear ? String(movieFallback.ProductionYear) : "";
        }
      }

      if (seriesItem && seriesItem.Id) {
        matchedItemName = seriesItem.Name || "Dizi";
        matchedItemYear = seriesItem.ProductionYear ? String(seriesItem.ProductionYear) : "";
        const episodeItem = await findEpisode(serverUrl, apiKey, seriesItem.Id, seasonNum, episodeNum, userId, log);
        if (episodeItem && episodeItem.Id) {
          targetItemId = episodeItem.Id;
        }
      }
    } else {
      // 1. Önce Film olarak ara
      let movieItem = await searchEmbyItem(serverUrl, userId, apiKey, idInfo, "Movie", log);

      // Bulunamazsa Dizi olarak da kontrol et
      if (!movieItem) {
        const seriesFallback = await searchEmbyItem(serverUrl, userId, apiKey, idInfo, "Series", log);
        if (seriesFallback && seriesFallback.Id) {
          matchedItemName = seriesFallback.Name || "Dizi";
          matchedItemYear = seriesFallback.ProductionYear ? String(seriesFallback.ProductionYear) : "";
          const episodeItem = await findEpisode(serverUrl, apiKey, seriesFallback.Id, 1, 1, userId, log);
          if (episodeItem && episodeItem.Id) {
            targetItemId = episodeItem.Id;
          }
        }
      } else {
        matchedItemName = movieItem.Name || "Film";
        matchedItemYear = movieItem.ProductionYear ? String(movieItem.ProductionYear) : "";
        targetItemId = movieItem.Id;
      }
    }

    if (!targetItemId) {
      log(`Emby'de eşleşen medya bulunamadı (ID: ${idInfo.cleanId})`);
      sendRemoteLog("MEDIA_NOT_FOUND", `Emby'de eşleşen medya bulunamadı (ID: ${idInfo.cleanId})`);
      if (activeConfig.debugMode) {
        return [{
          name: "[Emby Teşhis] Arşivde Bulunamadı",
          title: `ID: ${idInfo.cleanId} Emby arşivinizde eşleşmedi`,
          url: serverUrl,
          quality: "BİLGİ"
        }];
      }
      return [];
    }

    sendRemoteLog("TARGET_ITEM", `Hedef medya belirlendi: "${matchedItemName}" (Item ID: ${targetItemId})`);

    // 3. PlaybackInfo / MediaSources bilgisini al
    sendRemoteLog("PLAYBACK_INFO", `PlaybackInfo alınıyor (Item ID: ${targetItemId})`);
    const playbackData = await getPlaybackInfo(serverUrl, userId, apiKey, targetItemId, log);
    if (!playbackData || !Array.isArray(playbackData.MediaSources) || playbackData.MediaSources.length === 0) {
      log(`Item ${targetItemId} için oynatılabilir kaynak bulunamadı`);
      sendRemoteLog("NO_SOURCES", `Item ${targetItemId} (${matchedItemName}) için MediaSource bulunamadı!`);
      if (activeConfig.debugMode) {
        return [{
          name: "[Emby Teşhis] Kaynak Yok",
          title: `${matchedItemName} için MediaSource bulunamadı`,
          url: serverUrl,
          quality: "BİLGİ"
        }];
      }
      return [];
    }

    // ==========================================
    // AKILLI SIRALAMA: ÖNCE KALİTE, SONRA HDR/REMUX/BOYUT
    // ==========================================
    const resOrder = {
      "4K DCI": 0, "4K": 1, "2160p": 2, "1440p": 3, "1080p": 4,
      "720p": 5, "576p": 6, "480p": 7, "360p": 8, "SD": 9, "Unknown": 10
    };

    const sortedSources = playbackData.MediaSources.slice().sort((a, b) => {
      const vA = (a.MediaStreams || []).find(s => s.Type === "Video");
      const vB = (b.MediaStreams || []).find(s => s.Type === "Video");
      const qA = getQualityTag(vA);
      const qB = getQualityTag(vB);

      // 1. Önce Kalite Sıralaması (4K > 1440p > 1080p > 720p > ...)
      const rA = resOrder[qA] !== undefined ? resOrder[qA] : 10;
      const rB = resOrder[qB] !== undefined ? resOrder[qB] : 10;
      if (rA !== rB) return rA - rB;

      // 2. HDR Önceliği
      const hdrA = getHdrTag(vA) ? 1 : 0;
      const hdrB = getHdrTag(vB) ? 1 : 0;
      if (hdrA !== hdrB) return hdrB - hdrA;

      // 3. REMUX Önceliği
      const remuxA = isRemux(a) ? 1 : 0;
      const remuxB = isRemux(b) ? 1 : 0;
      if (remuxA !== remuxB) return remuxB - remuxA;

      // 4. Aynı Kalitede Boyut / Bitrate Sıralaması (Büyükten küçüğe)
      const sizeA = Number(a.Size) || Number(a.Bitrate) || 0;
      const sizeB = Number(b.Size) || Number(b.Bitrate) || 0;
      return sizeB - sizeA;
    });

    const streams = [];

    // 4. Her bir medya kaynağı için StreamBridge uyumlu akış nesnesi üret
    for (const source of sortedSources) {
      if (!source || !source.Id) continue;

      const mediaStreams = source.MediaStreams || [];
      const videoStream = mediaStreams.find(s => s.Type === "Video");
      const audioStream = mediaStreams.find(s => s.Type === "Audio" && s.IsDefault)
                       || mediaStreams.find(s => s.Type === "Audio");

      const qualityTag = getQualityTag(videoStream);
      const dimensions = getResolutionDimensions(videoStream);
      const hdrTag = getHdrTag(videoStream);
      const videoTag = getVideoTag(videoStream);
      const isRemuxSource = isRemux(source);
      const audioTag = getAudioTag(audioStream);
      const container = (source.Container || "mp4").toUpperCase();
      const bitrateFormatted = formatBitrate(source.Bitrate || (videoStream && videoStream.BitRate));
      const sizeFormatted = formatFileSize(source.Size);

      const mediaInfo = {
        qualityTag,
        resolutionDimensions: dimensions,
        hdrTag,
        videoTag,
        isRemux: isRemuxSource,
        audioTag,
        container,
        bitrateFormatted,
        sizeFormatted
      };

      const streamDescription = buildStreamDescription(mediaInfo);
      const filename = source.Path ? source.Path.split(/[\\/]/).pop() : (source.Name || "stream");
      const streamUrl = `${serverUrl}/emby/Videos/${targetItemId}/stream.${container.toLowerCase()}?static=true&MediaSourceId=${encodeURIComponent(source.Id)}&api_key=${encodeURIComponent(apiKey)}`;
      const subtitles = extractSubtitles(serverUrl, targetItemId, source, apiKey);
      const techDetails = [dimensions, hdrTag, videoTag, audioTag, container, bitrateFormatted].filter(Boolean).join(" • ");

      streams.push({
        name: "Emby",
        title: streamDescription,
        description: streamDescription,
        url: streamUrl,
        quality: qualityTag,
        size: sizeFormatted || "",
        language: techDetails || "",
        provider: "emby",
        type: container.toLowerCase(),
        headers: {
          "X-Emby-Token": apiKey
        },
        behaviorHints: {
          filename: filename,
          videoSize: Number(source.Size) || undefined,
          notWebReady: true,
          bingeGroup: `Emby-${(qualityTag || "Direct Play").trim()}`,
          headers: {
            "X-Emby-Token": apiKey
          },
          proxyHeaders: {
            request: {
              "X-Emby-Token": apiKey
            }
          }
        },
        subtitles: subtitles
      });
    }

    // Hata ayıklama modu açıksa en başa tıklanabilir teşhis kartı ekle
    if (activeConfig.debugMode && streams.length > 0) {
      streams.unshift({
        name: "[Emby Teşhis] Bağlantı Aktif",
        title: `${matchedItemName} • Emby ID: ${targetItemId} (${streams.length} kaynak)`,
        url: streams[0].url,
        quality: "TEŞHİS"
      });
    }

    log(`${streams.length} akış başarıyla üretildi`);
    sendRemoteLog("STREAMS_SUCCESS", `${streams.length} adet akış üretildi (${matchedItemName})`, {
      streamCount: streams.length,
      firstStream: streams[0] ? { name: streams[0].name, title: streams[0].title, url: streams[0].url } : null
    });

    return streams;
  } catch (error) {
    const errMsg = error ? (error.message || String(error)) : "Bilinmeyen hata";
    const errStack = error ? (error.stack || "") : "";
    console.error("[Emby Provider] getStreams beklenmeyen hata:", errMsg, errStack);
    sendRemoteLog("ERROR", `getStreams Hatası: ${errMsg}`, { stack: errStack, lastLogs: logs.slice(-2) });

    if (activeConfig.debugMode) {
      return [{
        name: "[Emby Hata] Beklenmeyen Hata",
        title: errMsg + " | " + logs.slice(-2).join(" • "),
        url: "http://localhost",
        quality: "HATA"
      }];
    }
    return [];
  }
}

/**
 * Nuvio ayarlar ekranı şeması
 */
async function onSettings() {
  sendRemoteLog("ON_SETTINGS", "Nuvio Ayarlar sayfası açıldı", {
    currentSettings: typeof globalThis !== "undefined" ? globalThis.SCRAPER_SETTINGS : null
  });

  return [
    {
      type: "header",
      label: "Emby Sunucu Bağlantısı"
    },
    {
      type: "text",
      key: "serverUrl",
      label: "Sunucu Adresi",
      description: "Örn: http://192.168.1.100:8096 veya https://emby.sunucunuz.com",
      defaultValue: CONFIG.serverUrl
    },
    {
      type: "text",
      key: "username",
      label: "Kullanıcı Adı",
      description: "Emby kullanıcı adınız",
      defaultValue: CONFIG.username
    },
    {
      type: "text",
      key: "password",
      label: "Şifre",
      description: "Emby kullanıcı şifreniz (hesabınız şifresizse boş bırakın)",
      defaultValue: CONFIG.password
    },
    {
      type: "toggle",
      key: "debugMode",
      label: "Hata Ayıklama Modu (Debug)",
      description: "Akış listesinde Emby bağlantı ve arama teşhis kartını gösterir",
      defaultValue: false
    }
  ];
}

// QuickJS, Hermes, CommonJS ve Global ortam uyumluluğu
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams, onSettings };
  module.exports.default = { getStreams, onSettings };
}
if (typeof exports !== "undefined") {
  exports.getStreams = getStreams;
  exports.onSettings = onSettings;
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.onSettings = onSettings;
}
if (typeof window !== "undefined") {
  window.getStreams = getStreams;
  window.onSettings = onSettings;
}
if (typeof global !== "undefined") {
  global.getStreams = getStreams;
  global.onSettings = onSettings;
}
