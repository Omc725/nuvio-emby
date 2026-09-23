var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const CONFIG = {
  serverUrl: "",
  // Emby sunucu adresi (Nuvio Ayarlar menüsünden giriniz)
  username: "",
  // Emby kullanıcı adı (Nuvio Ayarlar menüsünden giriniz)
  password: "",
  // Emby kullanıcı şifresi (Nuvio Ayarlar menüsünden giriniz)
  debugMode: false,
  // Alternatif doğrudan API Key (opsiyonel)
  apiKey: "",
  userId: ""
};
const LOG_ENDPOINT = "";
function sendRemoteLog(step, message, data) {
  try {
    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("tr-TR");
    const dataStr = data !== void 0 && data !== null ? ` | ${JSON.stringify(data)}` : "";
    const textMsg = `[${time}][${step}] ${message}${dataStr}`;
    console.log(`[Emby] ${textMsg}`);
    if (LOG_ENDPOINT && typeof fetch === "function") {
      fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: {
          "Title": `Nuvio Emby: ${step}`,
          "Priority": step === "ERROR" ? "high" : "default",
          "Tags": step === "ERROR" ? "warning" : step === "INIT" ? "rocket" : "information"
        },
        body: textMsg
      }).catch(function() {
      });
    }
  } catch (e) {
  }
}
try {
  sendRemoteLog("INIT", "emby.js (v3.5.0) Nuvio ortam\u0131nda ba\u015Far\u0131yla y\xFCklendi", {
    hasGlobalThis: typeof globalThis !== "undefined",
    hasSettings: typeof globalThis !== "undefined" && Boolean(globalThis.SCRAPER_SETTINGS)
  });
} catch (e) {
}
let authCache = {
  serverUrl: "",
  username: "",
  password: "",
  accessToken: "",
  userId: "",
  timestamp: 0
};
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
function getActiveConfig() {
  const dynamic = typeof globalThis !== "undefined" && globalThis.SCRAPER_SETTINGS ? globalThis.SCRAPER_SETTINGS : {};
  const serverUrl = dynamic.serverUrl !== void 0 && dynamic.serverUrl !== "" ? dynamic.serverUrl : CONFIG.serverUrl;
  const username = dynamic.username !== void 0 && dynamic.username !== "" ? dynamic.username : CONFIG.username;
  const password = dynamic.password !== void 0 && dynamic.password !== "" ? dynamic.password : CONFIG.password;
  const debugMode = dynamic.debugMode !== void 0 ? Boolean(dynamic.debugMode) : CONFIG.debugMode;
  let apiKey = dynamic.apiKey !== void 0 && dynamic.apiKey !== "" ? dynamic.apiKey : CONFIG.apiKey;
  let userId = dynamic.userId !== void 0 && dynamic.userId !== "" ? dynamic.userId : CONFIG.userId;
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
function sanitizeUrl(url) {
  if (!url) return "";
  let clean = String(url).trim().replace(/\/+$/, "");
  clean = clean.replace(/\/emby\/?$/i, "");
  if (!/^https?:\/\//i.test(clean)) {
    clean = `http://${clean}`;
  }
  return clean.replace(/\/+$/, "");
}
function normalizeLanguage(lang) {
  if (!lang) return "und";
  const clean = String(lang).toLowerCase().trim();
  if (clean.length === 2) return clean;
  if (LANG_MAP[clean]) return LANG_MAP[clean];
  if (clean.length === 3) return clean.substring(0, 2);
  return clean;
}
function getLangFlag(lang) {
  const code = normalizeLanguage(lang).toLowerCase();
  const flags = {
    tr: "\u{1F1F9}\u{1F1F7}",
    en: "\u{1F1EC}\u{1F1E7}",
    fr: "\u{1F1EB}\u{1F1F7}",
    de: "\u{1F1E9}\u{1F1EA}",
    es: "\u{1F1EA}\u{1F1F8}",
    it: "\u{1F1EE}\u{1F1F9}",
    ru: "\u{1F1F7}\u{1F1FA}",
    ja: "\u{1F1EF}\u{1F1F5}",
    ko: "\u{1F1F0}\u{1F1F7}",
    zh: "\u{1F1E8}\u{1F1F3}",
    ar: "\u{1F1F8}\u{1F1E6}",
    pt: "\u{1F1F5}\u{1F1F9}",
    nl: "\u{1F1F3}\u{1F1F1}",
    pl: "\u{1F1F5}\u{1F1F1}",
    sv: "\u{1F1F8}\u{1F1EA}",
    no: "\u{1F1F3}\u{1F1F4}",
    da: "\u{1F1E9}\u{1F1F0}",
    fi: "\u{1F1EB}\u{1F1EE}",
    el: "\u{1F1EC}\u{1F1F7}",
    he: "\u{1F1EE}\u{1F1F1}",
    hi: "\u{1F1EE}\u{1F1F3}",
    hu: "\u{1F1ED}\u{1F1FA}",
    id: "\u{1F1EE}\u{1F1E9}",
    ro: "\u{1F1F7}\u{1F1F4}",
    uk: "\u{1F1FA}\u{1F1E6}",
    vi: "\u{1F1FB}\u{1F1F3}",
    az: "\u{1F1E6}\u{1F1FF}",
    bg: "\u{1F1E7}\u{1F1EC}",
    cs: "\u{1F1E8}\u{1F1FF}"
  };
  return flags[code] || "\u{1F310}";
}
function parseInputId(id, season, episode) {
  let raw = "";
  let parsedSeason = season !== void 0 && season !== null && season !== "" ? Number(season) : void 0;
  let parsedEpisode = episode !== void 0 && episode !== null && episode !== "" ? Number(episode) : void 0;
  if (typeof id === "object" && id !== null) {
    raw = id.id || id.tmdbId || id.tmdb_id || id.imdbId || id.imdb_id || id.mediaId || id.title || "";
    if (parsedSeason === void 0 && (id.season !== void 0 || id.seasonNumber !== void 0)) {
      parsedSeason = Number(id.season !== void 0 ? id.season : id.seasonNumber);
    }
    if (parsedEpisode === void 0 && (id.episode !== void 0 || id.episodeNumber !== void 0)) {
      parsedEpisode = Number(id.episode !== void 0 ? id.episode : id.episodeNumber);
    }
  } else {
    raw = String(id || "").trim();
  }
  if (raw.includes(":")) {
    const parts = raw.split(":");
    const firstPart = parts[0].toLowerCase();
    if (firstPart === "tmdb" || firstPart === "imdb" || firstPart === "movie" || firstPart === "tv" || firstPart === "series") {
      parts.shift();
    }
    if (parts.length >= 3) {
      raw = parts[0];
      if (parsedSeason === void 0 || isNaN(parsedSeason)) parsedSeason = Number(parts[1]);
      if (parsedEpisode === void 0 || isNaN(parsedEpisode)) parsedEpisode = Number(parts[2]);
    } else if (parts.length === 2) {
      raw = parts[0];
      if (parsedSeason === void 0 || isNaN(parsedSeason)) parsedSeason = Number(parts[1]);
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
function detectQuality(videoStream) {
  const q = getQualityTag(videoStream);
  const resOrder = {
    "4K DCI": 100,
    "4K": 100,
    "2160p": 100,
    "1440p": 80,
    "1080p": 60,
    "720p": 40,
    "576p": 30,
    "480p": 20,
    "360p": 15,
    "SD": 10,
    "Unknown": 10
  };
  return {
    quality: q,
    p: videoStream && videoStream.Height ? `${videoStream.Height}p` : q,
    rank: resOrder[q] || 60
  };
}
function getResolutionDimensions(videoStream) {
  if (!videoStream) return null;
  const width = videoStream.Width;
  const height = videoStream.Height;
  if (width && height) {
    return `${width}x${height}`;
  }
  return null;
}
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
  if (profile && ["Main10", "High10", "Main 10"].some((p) => profile.includes(p))) {
    return `${displayCodec} 10bit`;
  }
  if (Number(videoStream.BitDepth) >= 10 && !displayCodec.includes("10bit")) {
    return `${displayCodec} 10bit`;
  }
  return displayCodec;
}
function getHdrTag(videoStream) {
  if (!videoStream) return null;
  switch (videoStream.ExtendedVideoType) {
    case "Hdr10":
      return "HDR10";
    case "Hdr10Plus":
      return "HDR10+";
    case "HyperLogGamma":
      return "HLG";
    case "DolbyVision":
      return "DV";
    default:
      break;
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
function isRemux(source) {
  if (!source) return false;
  const path = (source.Path || "").toLowerCase();
  const name = (source.Name || "").toLowerCase();
  return path.includes("remux") || name.includes("remux");
}
function formatBitrate(bps) {
  if (!bps || bps === 0) return null;
  const mbps = (Number(bps) / 1e6).toFixed(1);
  return `${mbps}Mbps`;
}
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
function buildStreamDescription(mediaInfo) {
  const lines = [];
  const resolutionLine = [];
  if (mediaInfo.qualityTag && mediaInfo.qualityTag !== "Unknown") {
    resolutionLine.push(mediaInfo.qualityTag);
  }
  if (mediaInfo.resolutionDimensions) {
    resolutionLine.push(mediaInfo.resolutionDimensions);
  }
  if (resolutionLine.length > 0) {
    lines.push(resolutionLine.join(" \u2022 "));
  }
  const typeLine = [];
  if (mediaInfo.hdrTag) {
    typeLine.push(mediaInfo.hdrTag);
  }
  if (mediaInfo.videoTag) {
    typeLine.push(mediaInfo.videoTag);
  }
  if (typeLine.length > 0) {
    lines.push(typeLine.join(" \u2022 "));
  }
  if (mediaInfo.isRemux) {
    lines.push("REMUX");
  }
  if (mediaInfo.audioTag) {
    lines.push(mediaInfo.audioTag);
  }
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
    lines.push(fileLine.join(" \u2022 "));
  }
  return lines.join("\n") || "Stream Available";
}
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
      const subIndex = stream.Index !== void 0 ? stream.Index : i;
      const langRaw = stream.Language || "und";
      const lang = normalizeLanguage(langRaw);
      const title = stream.DisplayTitle || stream.Title || stream.Language || "Subtitle";
      const isForced = Boolean(stream.IsForced);
      const isDefault = Boolean(stream.IsDefault);
      let label = title;
      if (isForced) label += " [Forced]";
      if (isDefault) label += " [Varsay\u0131lan]";
      let subUrl = "";
      if (stream.DeliveryUrl) {
        subUrl = stream.DeliveryUrl.startsWith("http") ? stream.DeliveryUrl : `${serverUrl}${stream.DeliveryUrl}`;
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
function authenticateEmby(serverUrl, username, password, logFn) {
  return __async(this, null, function* () {
    const now = Date.now();
    if (authCache.accessToken && authCache.userId && authCache.serverUrl === serverUrl && authCache.username === username && authCache.password === password && now - authCache.timestamp < 12 * 60 * 60 * 1e3) {
      if (logFn) logFn("Oturum: \xD6nbellekten kullan\u0131ld\u0131");
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
        if (logFn) logFn(`Giri\u015F yap\u0131l\u0131yor (${username})...`);
        const res = yield fetch(url, {
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
          if (logFn) logFn(`Giri\u015F ba\u015Far\u0131s\u0131z: HTTP ${res.status}`);
          continue;
        }
        const data = yield res.json();
        if (!data || !data.AccessToken || !data.User || !data.User.Id) {
          if (logFn) logFn("Giri\u015F yan\u0131t\u0131nda AccessToken veya User.Id bulunamad\u0131");
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
        if (logFn) logFn(`Giri\u015F ba\u015Far\u0131l\u0131: ${data.User.Name || username}`);
        return {
          apiKey: data.AccessToken,
          userId: data.User.Id
        };
      } catch (err) {
        if (logFn) logFn(`Giri\u015F hatas\u0131: ${err.message || err}`);
      }
    }
    return null;
  });
}
function fetchTmdbMetadata(cleanId, isImdb, isTv) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d, _e;
    try {
      if (isImdb) {
        const url = `https://api.themoviedb.org/3/find/${cleanId}?external_source=imdb_id&api_key=${TMDB_PUBLIC_API_KEY}`;
        const res = yield fetch(url);
        if (!res.ok) return null;
        const data = yield res.json();
        const match = (isTv ? (_a = data.tv_results) == null ? void 0 : _a[0] : (_b = data.movie_results) == null ? void 0 : _b[0]) || ((_c = data.movie_results) == null ? void 0 : _c[0]) || ((_d = data.tv_results) == null ? void 0 : _d[0]);
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
        const res = yield fetch(url);
        if (!res.ok) return null;
        const data = yield res.json();
        return {
          tmdbId: cleanId,
          imdbId: data.imdb_id || ((_e = data.external_ids) == null ? void 0 : _e.imdb_id) || null,
          title: data.title || data.name || "",
          originalTitle: data.original_title || data.original_name || "",
          year: (data.release_date || data.first_air_date || "").split("-")[0] || null
        };
      }
    } catch (e) {
      return null;
    }
    return null;
  });
}
function searchEmbyItem(serverUrl, userId, apiKey, idInfo, preferredType, logFn) {
  return __async(this, null, function* () {
    const { cleanId, isImdb } = idInfo;
    if (!cleanId) return null;
    const isTv = preferredType === "Series";
    const typeFilter = preferredType ? `&IncludeItemTypes=${encodeURIComponent(preferredType)}` : "";
    sendRemoteLog("SEARCH_START", `Arama ba\u015Flat\u0131ld\u0131: cleanId=${cleanId}, isImdb=${isImdb}, type=${preferredType}`);
    const providerQueries = isImdb ? [`imdb.${cleanId},Imdb.${cleanId}`, `tmdb.${cleanId},Tmdb.${cleanId}`] : [`tmdb.${cleanId},Tmdb.${cleanId}`, `TheMovieDb.${cleanId}`];
    for (const q of providerQueries) {
      const url = `${serverUrl}/emby/Users/${userId}/Items?AnyProviderIdEquals=${encodeURIComponent(q)}${typeFilter}&Recursive=true&api_key=${encodeURIComponent(apiKey)}`;
      try {
        const res = yield fetch(url, { headers: { "Accept": "application/json", "X-Emby-Token": apiKey } });
        if (!res.ok) continue;
        const data = yield res.json();
        if (data && Array.isArray(data.Items) && data.Items.length > 0) {
          const matched = (preferredType ? data.Items.find((i) => i.Type === preferredType) : null) || data.Items[0];
          if (logFn) logFn(`ProviderId (${q}) ile bulundu: ${matched.Name} (ID: ${matched.Id})`);
          sendRemoteLog("SEARCH_FOUND", `ProviderId ile bulundu: ${matched.Name} (ID: ${matched.Id}, Type: ${matched.Type})`);
          return matched;
        }
      } catch (err) {
        if (logFn) logFn(`Arama hatas\u0131: ${err.message || err}`);
        sendRemoteLog("SEARCH_ERROR", `ProviderId arama hatas\u0131 (${q}): ${err.message || err}`);
      }
    }
    sendRemoteLog("SEARCH_FALLBACK", `TMDB metadata sorgulan\u0131yor: ${cleanId}`);
    const meta = yield fetchTmdbMetadata(cleanId, isImdb, isTv);
    if (meta) {
      sendRemoteLog("TMDB_META", `TMDB metadata al\u0131nd\u0131: "${meta.title}" (${meta.year}), tmdbId=${meta.tmdbId}, imdbId=${meta.imdbId}`);
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
          const res = yield fetch(url, { headers: { "Accept": "application/json", "X-Emby-Token": apiKey } });
          if (res.ok) {
            const data = yield res.json();
            if (data && Array.isArray(data.Items) && data.Items.length > 0) {
              const matched = (preferredType ? data.Items.find((i) => i.Type === preferredType) : null) || data.Items[0];
              if (logFn) logFn(`Alternatif ID (${altQ}) ile bulundu: ${matched.Name} (ID: ${matched.Id})`);
              sendRemoteLog("SEARCH_FOUND", `Alternatif ID ile bulundu: ${matched.Name} (ID: ${matched.Id})`);
              return matched;
            }
          }
        } catch (e) {
        }
      }
      const titles = [meta.title, meta.originalTitle].filter(Boolean);
      for (const title of titles) {
        const url = `${serverUrl}/emby/Users/${userId}/Items?SearchTerm=${encodeURIComponent(title)}${typeFilter}&Recursive=true&api_key=${encodeURIComponent(apiKey)}`;
        try {
          const res = yield fetch(url, { headers: { "Accept": "application/json", "X-Emby-Token": apiKey } });
          if (res.ok) {
            const data = yield res.json();
            if (data && Array.isArray(data.Items) && data.Items.length > 0) {
              const matched = meta.year ? data.Items.find((item) => String(item.ProductionYear) === String(meta.year) && item.Type === preferredType) || data.Items.find((item) => String(item.ProductionYear) === String(meta.year)) || data.Items[0] : (preferredType ? data.Items.find((i) => i.Type === preferredType) : null) || data.Items[0];
              if (logFn) logFn(`Ba\u015Fl\u0131k ile bulundu (${title}): ${matched.Name} (ID: ${matched.Id})`);
              sendRemoteLog("SEARCH_FOUND", `Ba\u015Fl\u0131k ile bulundu: ${matched.Name} (ID: ${matched.Id})`);
              return matched;
            }
          }
        } catch (e) {
        }
      }
    }
    try {
      const url = `${serverUrl}/emby/Users/${userId}/Items?SearchTerm=${encodeURIComponent(cleanId)}${typeFilter}&Recursive=true&api_key=${encodeURIComponent(apiKey)}`;
      const res = yield fetch(url, { headers: { "Accept": "application/json", "X-Emby-Token": apiKey } });
      if (res.ok) {
        const data = yield res.json();
        if (data && Array.isArray(data.Items) && data.Items.length > 0) {
          const matched = (preferredType ? data.Items.find((i) => i.Type === preferredType) : null) || data.Items[0];
          if (logFn) logFn(`SearchTerm ile bulundu: ${matched.Name} (ID: ${matched.Id})`);
          sendRemoteLog("SEARCH_FOUND", `SearchTerm ile bulundu: ${matched.Name} (ID: ${matched.Id})`);
          return matched;
        }
      }
    } catch (e) {
    }
    if (logFn) logFn(`Emby'de e\u015Fle\u015Fen \xF6\u011Fe bulunamad\u0131 (ID: ${cleanId})`);
    sendRemoteLog("SEARCH_NOT_FOUND", `Emby'de e\u015Fle\u015Fen \xF6\u011Fe bulunamad\u0131 (ID: ${cleanId}, Type: ${preferredType})`);
    return null;
  });
}
function findEpisode(serverUrl, apiKey, seriesId, season, episode, userId, logFn) {
  return __async(this, null, function* () {
    const targetSeason = Number(season);
    const targetEpisode = Number(episode);
    const seasonQuery = !isNaN(targetSeason) ? `Season=${targetSeason}&` : "";
    const userQuery = userId ? `UserId=${encodeURIComponent(userId)}&` : "";
    const url = `${serverUrl}/emby/Shows/${seriesId}/Episodes?${seasonQuery}${userQuery}api_key=${encodeURIComponent(apiKey)}`;
    try {
      const res = yield fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Emby-Token": apiKey
        }
      });
      if (!res.ok) {
        if (logFn) logFn(`B\xF6l\xFCm listesi al\u0131namad\u0131: HTTP ${res.status}`);
        sendRemoteLog("EPISODE_ERROR", `B\xF6l\xFCm listesi al\u0131namad\u0131: HTTP ${res.status}`);
        return null;
      }
      const data = yield res.json();
      if (!data || !Array.isArray(data.Items)) {
        if (logFn) logFn("B\xF6l\xFCm listesi bo\u015F d\xF6nd\xFC");
        sendRemoteLog("EPISODE_NOT_FOUND", "B\xF6l\xFCm listesi bo\u015F d\xF6nd\xFC");
        return null;
      }
      const matchedEpisode = data.Items.find((item) => {
        const epNum = Number(item.IndexNumber);
        const sNum = Number(item.ParentIndexNumber);
        const matchesEpisode = !isNaN(targetEpisode) && epNum === targetEpisode;
        const matchesSeason = isNaN(targetSeason) || isNaN(sNum) || sNum === targetSeason;
        return matchesEpisode && matchesSeason;
      });
      if (matchedEpisode) {
        if (logFn) logFn(`B\xF6l\xFCm bulundu: S${season}E${episode} - ${matchedEpisode.Name || "B\xF6l\xFCm"} (ID: ${matchedEpisode.Id})`);
        sendRemoteLog("EPISODE_FOUND", `B\xF6l\xFCm bulundu: S${season}E${episode} - ${matchedEpisode.Name || "B\xF6l\xFCm"} (ID: ${matchedEpisode.Id})`);
        return matchedEpisode;
      } else {
        if (logFn) logFn(`B\xF6l\xFCm e\u015Fle\u015Fmedi (Aranan S${season}E${episode})`);
        sendRemoteLog("EPISODE_NOT_FOUND", `B\xF6l\xFCm e\u015Fle\u015Fmedi (Aranan S${season}E${episode})`);
        return null;
      }
    } catch (err) {
      if (logFn) logFn(`B\xF6l\xFCm arama hatas\u0131: ${err.message || err}`);
      sendRemoteLog("EPISODE_ERROR", `B\xF6l\xFCm arama hatas\u0131: ${err.message || err}`);
      return null;
    }
  });
}
function getPlaybackInfo(serverUrl, userId, apiKey, itemId, logFn) {
  return __async(this, null, function* () {
    const endpoints = [
      `${serverUrl}/emby/Items/${itemId}/PlaybackInfo?api_key=${encodeURIComponent(apiKey)}&UserId=${encodeURIComponent(userId)}`,
      `${serverUrl}/emby/Users/${userId}/Items/${itemId}/PlaybackInfo?api_key=${encodeURIComponent(apiKey)}`,
      `${serverUrl}/Items/${itemId}/PlaybackInfo?api_key=${encodeURIComponent(apiKey)}&UserId=${encodeURIComponent(userId)}`
    ];
    for (const url of endpoints) {
      try {
        const res = yield fetch(url, {
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
        const data = yield res.json();
        if (data && Array.isArray(data.MediaSources) && data.MediaSources.length > 0) {
          if (logFn) logFn(`PlaybackInfo al\u0131nd\u0131: ${data.MediaSources.length} kaynak`);
          return data;
        }
      } catch (err) {
      }
    }
    try {
      const itemUrl = `${serverUrl}/emby/Users/${userId}/Items/${itemId}?api_key=${encodeURIComponent(apiKey)}`;
      const res = yield fetch(itemUrl, {
        method: "GET",
        headers: { "Accept": "application/json", "X-Emby-Token": apiKey }
      });
      if (res.ok) {
        const itemData = yield res.json();
        if (itemData && Array.isArray(itemData.MediaSources) && itemData.MediaSources.length > 0) {
          if (logFn) logFn(`\xD6\u011Fe detay\u0131ndan MediaSources al\u0131nd\u0131: ${itemData.MediaSources.length} kaynak`);
          return itemData;
        }
      }
    } catch (err) {
    }
    if (logFn) logFn("PlaybackInfo kaynak bulamad\u0131");
    return null;
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
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
    const targetSeason = idInfo.season !== void 0 ? idInfo.season : season;
    const targetEpisode = idInfo.episode !== void 0 ? idInfo.episode : episode;
    log(`v3.5.0 \xE7al\u0131\u015Ft\u0131 (ID: ${JSON.stringify(tmdbId)} -> ${idInfo.cleanId}, T\xFCr: ${detectedMediaType}, S: ${targetSeason}, E: ${targetEpisode})`);
    sendRemoteLog("GET_STREAMS", `getStreams \xE7a\u011Fr\u0131ld\u0131: ID=${JSON.stringify(tmdbId)} (${idInfo.cleanId})`, {
      rawId: tmdbId,
      cleanId: idInfo.cleanId,
      isImdb: idInfo.isImdb,
      mediaType: detectedMediaType,
      targetSeason,
      targetEpisode
    });
    try {
      const activeConfig2 = getActiveConfig();
      const serverUrl = sanitizeUrl(activeConfig2.serverUrl);
      let { apiKey, userId } = activeConfig2;
      if (!serverUrl) {
        log("HATA: Sunucu adresi bo\u015F!");
        sendRemoteLog("ERROR", "Sunucu adresi bo\u015F!");
        return activeConfig2.debugMode ? [{
          name: "[Emby Te\u015Fhis] Sunucu Adresi Bo\u015F",
          title: "Emby ayarlar\u0131ndan sunucu adresinizi girin",
          url: "http://localhost",
          quality: "HATA"
        }] : [];
      }
      if (!apiKey && activeConfig2.username) {
        sendRemoteLog("AUTH_START", `Giri\u015F yap\u0131l\u0131yor: ${activeConfig2.username} -> ${serverUrl}`);
        const auth = yield authenticateEmby(serverUrl, activeConfig2.username, activeConfig2.password, log);
        if (!auth) {
          sendRemoteLog("AUTH_FAIL", `Giri\u015F ba\u015Far\u0131s\u0131z: ${logs.slice(-2).join(" \u2022 ")}`);
          return activeConfig2.debugMode ? [{
            name: "[Emby Te\u015Fhis] Giri\u015F Ba\u015Far\u0131s\u0131z",
            title: logs.slice(-2).join(" \u2022 "),
            url: serverUrl,
            quality: "HATA"
          }] : [];
        }
        apiKey = auth.apiKey;
        userId = auth.userId;
        sendRemoteLog("AUTH_SUCCESS", `Giri\u015F ba\u015Far\u0131l\u0131: User ID ${userId}`);
      }
      if (!apiKey || !userId) {
        log("HATA: API anahtar\u0131 veya Kullan\u0131c\u0131 ID al\u0131namad\u0131!");
        sendRemoteLog("AUTH_FAIL", "API anahtar\u0131 veya Kullan\u0131c\u0131 ID al\u0131namad\u0131!");
        return activeConfig2.debugMode ? [{
          name: "[Emby Te\u015Fhis] Yetkilendirme Ba\u015Far\u0131s\u0131z",
          title: logs.slice(-2).join(" \u2022 "),
          url: serverUrl,
          quality: "HATA"
        }] : [];
      }
      if (!idInfo.cleanId) {
        log("HATA: ID parametresi bo\u015F!");
        sendRemoteLog("ERROR", "ID parametresi bo\u015F!");
        return [];
      }
      let isTv = detectedMediaType === "tv" || detectedMediaType === "series" || detectedMediaType === "show";
      if (!isTv && (targetSeason !== void 0 || targetEpisode !== void 0)) {
        isTv = true;
      }
      let targetItemId = null;
      let matchedItemName = "";
      let matchedItemYear = "";
      if (isTv) {
        const seasonNum = targetSeason !== void 0 ? targetSeason : 1;
        const episodeNum = targetEpisode !== void 0 ? targetEpisode : 1;
        let seriesItem = yield searchEmbyItem(serverUrl, userId, apiKey, idInfo, "Series", log);
        if (!seriesItem) {
          const movieFallback = yield searchEmbyItem(serverUrl, userId, apiKey, idInfo, "Movie", log);
          if (movieFallback) {
            targetItemId = movieFallback.Id;
            matchedItemName = movieFallback.Name || "Film";
            matchedItemYear = movieFallback.ProductionYear ? String(movieFallback.ProductionYear) : "";
          }
        }
        if (seriesItem && seriesItem.Id) {
          matchedItemName = seriesItem.Name || "Dizi";
          matchedItemYear = seriesItem.ProductionYear ? String(seriesItem.ProductionYear) : "";
          const episodeItem = yield findEpisode(serverUrl, apiKey, seriesItem.Id, seasonNum, episodeNum, userId, log);
          if (episodeItem && episodeItem.Id) {
            targetItemId = episodeItem.Id;
          }
        }
      } else {
        let movieItem = yield searchEmbyItem(serverUrl, userId, apiKey, idInfo, "Movie", log);
        if (!movieItem) {
          const seriesFallback = yield searchEmbyItem(serverUrl, userId, apiKey, idInfo, "Series", log);
          if (seriesFallback && seriesFallback.Id) {
            matchedItemName = seriesFallback.Name || "Dizi";
            matchedItemYear = seriesFallback.ProductionYear ? String(seriesFallback.ProductionYear) : "";
            const episodeItem = yield findEpisode(serverUrl, apiKey, seriesFallback.Id, 1, 1, userId, log);
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
        log(`Emby'de e\u015Fle\u015Fen medya bulunamad\u0131 (ID: ${idInfo.cleanId})`);
        sendRemoteLog("MEDIA_NOT_FOUND", `Emby'de e\u015Fle\u015Fen medya bulunamad\u0131 (ID: ${idInfo.cleanId})`);
        if (activeConfig2.debugMode) {
          return [{
            name: "[Emby Te\u015Fhis] Ar\u015Fivde Bulunamad\u0131",
            title: `ID: ${idInfo.cleanId} Emby ar\u015Fivinizde e\u015Fle\u015Fmedi`,
            url: serverUrl,
            quality: "B\u0130LG\u0130"
          }];
        }
        return [];
      }
      sendRemoteLog("TARGET_ITEM", `Hedef medya belirlendi: "${matchedItemName}" (Item ID: ${targetItemId})`);
      sendRemoteLog("PLAYBACK_INFO", `PlaybackInfo al\u0131n\u0131yor (Item ID: ${targetItemId})`);
      const playbackData = yield getPlaybackInfo(serverUrl, userId, apiKey, targetItemId, log);
      if (!playbackData || !Array.isArray(playbackData.MediaSources) || playbackData.MediaSources.length === 0) {
        log(`Item ${targetItemId} i\xE7in oynat\u0131labilir kaynak bulunamad\u0131`);
        sendRemoteLog("NO_SOURCES", `Item ${targetItemId} (${matchedItemName}) i\xE7in MediaSource bulunamad\u0131!`);
        if (activeConfig2.debugMode) {
          return [{
            name: "[Emby Te\u015Fhis] Kaynak Yok",
            title: `${matchedItemName} i\xE7in MediaSource bulunamad\u0131`,
            url: serverUrl,
            quality: "B\u0130LG\u0130"
          }];
        }
        return [];
      }
      const resOrder = {
        "4K DCI": 0,
        "4K": 1,
        "2160p": 2,
        "1440p": 3,
        "1080p": 4,
        "720p": 5,
        "576p": 6,
        "480p": 7,
        "360p": 8,
        "SD": 9,
        "Unknown": 10
      };
      const sortedSources = playbackData.MediaSources.slice().sort((a, b) => {
        const vA = (a.MediaStreams || []).find((s) => s.Type === "Video");
        const vB = (b.MediaStreams || []).find((s) => s.Type === "Video");
        const qA = getQualityTag(vA);
        const qB = getQualityTag(vB);
        const rA = resOrder[qA] !== void 0 ? resOrder[qA] : 10;
        const rB = resOrder[qB] !== void 0 ? resOrder[qB] : 10;
        if (rA !== rB) return rA - rB;
        const hdrA = getHdrTag(vA) ? 1 : 0;
        const hdrB = getHdrTag(vB) ? 1 : 0;
        if (hdrA !== hdrB) return hdrB - hdrA;
        const remuxA = isRemux(a) ? 1 : 0;
        const remuxB = isRemux(b) ? 1 : 0;
        if (remuxA !== remuxB) return remuxB - remuxA;
        const sizeA = Number(a.Size) || Number(a.Bitrate) || 0;
        const sizeB = Number(b.Size) || Number(b.Bitrate) || 0;
        return sizeB - sizeA;
      });
      const streams = [];
      for (const source of sortedSources) {
        if (!source || !source.Id) continue;
        const mediaStreams = source.MediaStreams || [];
        const videoStream = mediaStreams.find((s) => s.Type === "Video");
        const audioStream = mediaStreams.find((s) => s.Type === "Audio" && s.IsDefault) || mediaStreams.find((s) => s.Type === "Audio");
        const qualityTag = getQualityTag(videoStream);
        const dimensions = getResolutionDimensions(videoStream);
        const hdrTag = getHdrTag(videoStream);
        const videoTag = getVideoTag(videoStream);
        const isRemuxSource = isRemux(source);
        const audioTag = getAudioTag(audioStream);
        const container = (source.Container || "mp4").toUpperCase();
        const bitrateFormatted = formatBitrate(source.Bitrate || videoStream && videoStream.BitRate);
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
        const filename = source.Path ? source.Path.split(/[\\/]/).pop() : source.Name || "stream";
        const streamUrl = `${serverUrl}/emby/Videos/${targetItemId}/stream.${container.toLowerCase()}?static=true&MediaSourceId=${encodeURIComponent(source.Id)}&api_key=${encodeURIComponent(apiKey)}`;
        const subtitles = extractSubtitles(serverUrl, targetItemId, source, apiKey);
        const techDetails = [dimensions, hdrTag, videoTag, audioTag, container, bitrateFormatted].filter(Boolean).join(" \u2022 ");
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
            filename,
            videoSize: Number(source.Size) || void 0,
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
          subtitles
        });
      }
      if (activeConfig2.debugMode && streams.length > 0) {
        streams.unshift({
          name: "[Emby Te\u015Fhis] Ba\u011Flant\u0131 Aktif",
          title: `${matchedItemName} \u2022 Emby ID: ${targetItemId} (${streams.length} kaynak)`,
          url: streams[0].url,
          quality: "TE\u015EH\u0130S"
        });
      }
      log(`${streams.length} ak\u0131\u015F ba\u015Far\u0131yla \xFCretildi`);
      sendRemoteLog("STREAMS_SUCCESS", `${streams.length} adet ak\u0131\u015F \xFCretildi (${matchedItemName})`, {
        streamCount: streams.length,
        firstStream: streams[0] ? { name: streams[0].name, title: streams[0].title, url: streams[0].url } : null
      });
      return streams;
    } catch (error) {
      const errMsg = error ? error.message || String(error) : "Bilinmeyen hata";
      const errStack = error ? error.stack || "" : "";
      console.error("[Emby Provider] getStreams beklenmeyen hata:", errMsg, errStack);
      sendRemoteLog("ERROR", `getStreams Hatas\u0131: ${errMsg}`, { stack: errStack, lastLogs: logs.slice(-2) });
      if (activeConfig.debugMode) {
        return [{
          name: "[Emby Hata] Beklenmeyen Hata",
          title: errMsg + " | " + logs.slice(-2).join(" \u2022 "),
          url: "http://localhost",
          quality: "HATA"
        }];
      }
      return [];
    }
  });
}
function onSettings() {
  return __async(this, null, function* () {
    sendRemoteLog("ON_SETTINGS", "Nuvio Ayarlar sayfas\u0131 a\xE7\u0131ld\u0131", {
      currentSettings: typeof globalThis !== "undefined" ? globalThis.SCRAPER_SETTINGS : null
    });
    return [
      {
        type: "header",
        label: "Emby Sunucu Ba\u011Flant\u0131s\u0131"
      },
      {
        type: "text",
        key: "serverUrl",
        label: "Sunucu Adresi",
        description: "\xD6rn: http://192.168.1.100:8096 veya https://emby.sunucunuz.com",
        defaultValue: CONFIG.serverUrl
      },
      {
        type: "text",
        key: "username",
        label: "Kullan\u0131c\u0131 Ad\u0131",
        description: "Emby kullan\u0131c\u0131 ad\u0131n\u0131z",
        defaultValue: CONFIG.username
      },
      {
        type: "text",
        key: "password",
        label: "\u015Eifre",
        description: "Emby kullan\u0131c\u0131 \u015Fifreniz (hesab\u0131n\u0131z \u015Fifresizse bo\u015F b\u0131rak\u0131n)",
        defaultValue: CONFIG.password
      },
      {
        type: "toggle",
        key: "debugMode",
        label: "Hata Ay\u0131klama Modu (Debug)",
        description: "Ak\u0131\u015F listesinde Emby ba\u011Flant\u0131 ve arama te\u015Fhis kart\u0131n\u0131 g\xF6sterir",
        defaultValue: false
      }
    ];
  });
}
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
