/**
 * Nuvio Emby Cloudflare Worker
 * 
 * Provides:
 *  1. Interactive Turkish Web Configurator at / and /configure
 *  2. Full Stremio Addon Protocol for Nuvio (Rich multi-line card + BOYUT badge):
 *     - /:config/manifest.json
 *     - /:config/stream/:type/:id.json
 *  3. Injected transpiled emby.js at /:config/providers/emby.js and /:config/emby.js
 *  4. Live connection test proxy at /api/test-connection
 *  5. Unconfigured fallback at /manifest.json and /providers/emby.js
 */

const BASE_MANIFEST = {
  "id": "org.omc725.nuvioemby",
  "name": "Emby / Jellyfin",
  "version": "3.6.0",
  "description": "Nuvio doğrudan oynatma (Direct Play), dinamik kütüphaneler ve koleksiyonlar eklentisi (Emby & Jellyfin)",
  "logo": "https://emby.media/images/embyicon.png",
  "resources": [
    "catalog",
    "meta",
    "stream"
  ],
  "types": [
    "movie",
    "series"
  ],
  "idPrefixes": [
    "tt",
    "tmdb:",
    "emby:"
  ],
  "catalogs": [],
  "behaviorHints": {
    "configurable": false,
    "configurationRequired": false
  },
  "scrapers": [
    {
      "id": "emby",
      "name": "Emby / Jellyfin",
      "description": "Emby ve Jellyfin yerel/uzak sunucuları için doğrudan oynatma (Direct Play) ve altyazı sağlayıcısı",
      "version": "3.6.0",
      "author": "Omc725",
      "supportedTypes": [
        "movie",
        "tv"
      ],
      "filename": "providers/emby.js",
      "enabled": true,
      "hasSettings": true,
      "formats": [
        "mp4",
        "mkv",
        "hls"
      ],
      "logo": "https://emby.media/images/embyicon.png",
      "contentLanguage": [
        "tr",
        "en"
      ],
      "supportsExternalPlayer": true
    }
  ]
};
const EMBY_BASE_CODE = "var __async = (__this, __arguments, generator) => {\n  return new Promise((resolve, reject) => {\n    var fulfilled = (value) => {\n      try {\n        step(generator.next(value));\n      } catch (e) {\n        reject(e);\n      }\n    };\n    var rejected = (value) => {\n      try {\n        step(generator.throw(value));\n      } catch (e) {\n        reject(e);\n      }\n    };\n    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);\n    step((generator = generator.apply(__this, __arguments)).next());\n  });\n};\nconst CONFIG = {\n  serverUrl: \"\",\n  // Emby veya Jellyfin sunucu adresi (Nuvio Ayarlar menüsünden giriniz)\n  username: \"\",\n  // Emby / Jellyfin kullanıcı adı (Nuvio Ayarlar menüsünden giriniz)\n  password: \"\",\n  // Emby / Jellyfin kullanıcı şifresi (Nuvio Ayarlar menüsünden giriniz)\n  debugMode: false,\n  // Alternatif doğrudan API Key (opsiyonel)\n  apiKey: \"\",\n  userId: \"\"\n};\nconst LOG_ENDPOINT = \"\";\nfunction sendRemoteLog(step, message, data) {\n  try {\n    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString(\"tr-TR\");\n    const dataStr = data !== void 0 && data !== null ? ` | ${JSON.stringify(data)}` : \"\";\n    const textMsg = `[${time}][${step}] ${message}${dataStr}`;\n    console.log(`[Emby/Jellyfin] ${textMsg}`);\n    if (LOG_ENDPOINT && typeof fetch === \"function\") {\n      fetch(LOG_ENDPOINT, {\n        method: \"POST\",\n        headers: {\n          \"Title\": `Nuvio Provider: ${step}`,\n          \"Priority\": step === \"ERROR\" ? \"high\" : \"default\",\n          \"Tags\": step === \"ERROR\" ? \"warning\" : step === \"INIT\" ? \"rocket\" : \"information\"\n        },\n        body: textMsg\n      }).catch(function() {\n      });\n    }\n  } catch (e) {\n  }\n}\ntry {\n  sendRemoteLog(\"INIT\", \"emby.js (v3.6.0) Emby & Jellyfin Provider y\\xFCklendi\", {\n    hasGlobalThis: typeof globalThis !== \"undefined\",\n    hasSettings: typeof globalThis !== \"undefined\" && Boolean(globalThis.SCRAPER_SETTINGS)\n  });\n} catch (e) {\n}\nlet authCache = {\n  serverUrl: \"\",\n  username: \"\",\n  password: \"\",\n  accessToken: \"\",\n  userId: \"\",\n  timestamp: 0\n};\nlet serverInfoCache = {\n  serverUrl: \"\",\n  prefix: \"\",\n  serverType: \"emby\",\n  serverName: \"\",\n  timestamp: 0\n};\nfunction getAuthHeaders(apiKey) {\n  const headers = {\n    \"Accept\": \"application/json\"\n  };\n  if (apiKey) {\n    headers[\"X-Emby-Token\"] = apiKey;\n    headers[\"X-MediaBrowser-Token\"] = apiKey;\n    headers[\"Authorization\"] = `MediaBrowser Token=\"${apiKey}\"`;\n  }\n  return headers;\n}\nconst TMDB_PUBLIC_API_KEY = \"439c478a771f35c05022f9feabcca01c\";\nconst LANG_MAP = {\n  tur: \"tr\",\n  eng: \"en\",\n  fre: \"fr\",\n  fra: \"fr\",\n  ger: \"de\",\n  deu: \"de\",\n  spa: \"es\",\n  ita: \"it\",\n  por: \"pt\",\n  rus: \"ru\",\n  ara: \"ar\",\n  jpn: \"ja\",\n  kor: \"ko\",\n  chi: \"zh\",\n  zho: \"zh\",\n  dut: \"nl\",\n  nld: \"nl\",\n  pol: \"pl\",\n  swe: \"sv\",\n  nor: \"no\",\n  dan: \"da\",\n  fin: \"fi\",\n  ell: \"el\",\n  gre: \"el\",\n  heb: \"he\",\n  hin: \"hi\",\n  hun: \"hu\",\n  ind: \"id\",\n  ron: \"ro\",\n  rum: \"ro\",\n  ukr: \"uk\",\n  vie: \"vi\",\n  aze: \"az\",\n  bul: \"bg\",\n  ces: \"cs\",\n  cze: \"cs\"\n};\nconst V2_MARKERS = {\n  res: {\n    \"4K\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200D\\u200C\\u200C\\u200D\\u2064\",\n    \"2160p\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200D\\u200C\\u200C\\u200D\\u2064\",\n    \"1440p\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200D\\u200C\\u200D\\u200C\\u2064\",\n    \"1080p\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200D\\u200C\\u200D\\u200D\\u2064\",\n    \"720p\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200D\\u200D\\u200C\\u200C\\u2064\",\n    \"480p\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200D\\u200D\\u200D\\u200C\\u2064\"\n  },\n  quality: {\n    \"REMUX\": \"\\u2063\\u200C\\u200C\\u200D\\u200C\\u200C\\u200C\\u200D\\u200C\\u2064\",\n    \"BluRay\": \"\\u2063\\u200C\\u200C\\u200D\\u200C\\u200C\\u200C\\u200D\\u200D\\u2064\",\n    \"WEB-DL\": \"\\u2063\\u200C\\u200C\\u200D\\u200C\\u200C\\u200D\\u200C\\u200C\\u2064\",\n    \"WEBRip\": \"\\u2063\\u200C\\u200C\\u200D\\u200C\\u200C\\u200D\\u200C\\u200D\\u2064\",\n    \"HDRip\": \"\\u2063\\u200C\\u200C\\u200D\\u200C\\u200C\\u200D\\u200D\\u200C\\u2064\",\n    \"HDTV\": \"\\u2063\\u200C\\u200C\\u200D\\u200C\\u200D\\u200C\\u200C\\u200D\\u2064\"\n  },\n  visual: {\n    \"DV\": \"\\u2063\\u200C\\u200C\\u200C\\u200C\\u200C\\u200C\\u200C\\u200C\\u200D\\u2064\",\n    \"HDR10+\": \"\\u2063\\u200C\\u200C\\u200C\\u200C\\u200C\\u200C\\u200D\\u200C\\u2064\",\n    \"HDR10\": \"\\u2063\\u200C\\u200C\\u200C\\u200C\\u200C\\u200C\\u200D\\u200D\\u2064\",\n    \"HDR\": \"\\u2063\\u200C\\u200C\\u200C\\u200C\\u200C\\u200D\\u200C\\u200C\\u2064\",\n    \"10bit\": \"\\u2063\\u200C\\u200C\\u200C\\u200C\\u200C\\u200D\\u200D\\u200C\\u2064\",\n    \"SDR\": \"\\u2063\\u200C\\u200C\\u200C\\u200C\\u200C\\u200D\\u200D\\u200D\\u2064\",\n    \"HLG\": \"\\u2063\\u200C\\u200C\\u200C\\u200C\\u200C\\u200D\\u200C\\u200D\\u2064\"\n  },\n  codec: {\n    \"HEVC\": \"\\u2063\\u200C\\u200C\\u200D\\u200C\\u200D\\u200D\\u200D\\u200D\\u2064\",\n    \"AVC\": \"\\u2063\\u200C\\u200C\\u200D\\u200D\\u200C\\u200C\\u200C\\u200C\\u2064\",\n    \"AV1\": \"\\u2063\\u200C\\u200C\\u200D\\u200C\\u200D\\u200D\\u200D\\u200C\\u2064\",\n    \"XviD\": \"\\u2063\\u200C\\u200C\\u200D\\u200D\\u200C\\u200C\\u200C\\u200D\\u2064\"\n  },\n  audio: {\n    \"TrueHD Atmos\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200C\\u200C\\u200C\\u200D\\u2064\\u2063\\u200C\\u200C\\u200C\\u200C\\u200D\\u200C\\u200C\\u200D\\u2064\",\n    \"Atmos\": \"\\u2063\\u200C\\u200C\\u200C\\u200C\\u200D\\u200C\\u200C\\u200D\\u2064\",\n    \"TrueHD\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200C\\u200C\\u200C\\u200D\\u2064\",\n    \"DTS-HD MA\": \"\\u2063\\u200C\\u200C\\u200C\\u200C\\u200D\\u200D\\u200C\\u200D\\u2064\",\n    \"DTS:X\": \"\\u2063\\u200C\\u200C\\u200C\\u200C\\u200D\\u200D\\u200C\\u200C\\u2064\",\n    \"DTS\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200C\\u200C\\u200C\\u200C\\u2064\",\n    \"DD+\": \"\\u2063\\u200C\\u200C\\u200C\\u200C\\u200D\\u200C\\u200D\\u200C\\u2064\",\n    \"DD\": \"\\u2063\\u200C\\u200C\\u200C\\u200C\\u200D\\u200C\\u200D\\u200D\\u2064\",\n    \"AC3\": \"\\u2063\\u200C\\u200C\\u200C\\u200C\\u200D\\u200C\\u200D\\u200D\\u2064\",\n    \"AAC\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200C\\u200C\\u200D\\u200D\\u2064\",\n    \"FLAC\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200C\\u200D\\u200C\\u200C\\u2064\",\n    \"OPUS\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200C\\u200C\\u200D\\u200C\\u2064\"\n  },\n  channels: {\n    \"7.1\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200C\\u200D\\u200C\\u200D\\u2064\",\n    \"6.1\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200C\\u200D\\u200D\\u200C\\u2064\",\n    \"5.1\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200C\\u200D\\u200D\\u200D\\u2064\",\n    \"2.0\": \"\\u2063\\u200C\\u200C\\u200C\\u200D\\u200D\\u200C\\u200C\\u200C\\u2064\"\n  },\n  lang: {\n    \"TR\": \"\\u2063\\u2062\\u200D\\u2060\\u2060\\u200C\\u2064\",\n    \"EN\": \"\\u2063\\u2062\\u2060\\u200C\\u200C\\u200C\\u2064\",\n    \"FR\": \"\\u2063\\u2062\\u200C\\u200C\\u200D\\u200C\\u2064\",\n    \"DE\": \"\\u2063\\u2062\\u200D\\u200C\\u200D\\u200C\\u2064\",\n    \"ES\": \"\\u2063\\u2062\\u2060\\u2060\\u200C\\u200C\\u2064\",\n    \"IT\": \"\\u2063\\u2062\\u2060\\u200C\\u200D\\u200C\\u2064\",\n    \"RU\": \"\\u2063\\u2062\\u2060\\u200D\\u200C\\u200C\\u2064\"\n  }\n};\nfunction getActiveConfig() {\n  const dynamic = typeof globalThis !== \"undefined\" && globalThis.SCRAPER_SETTINGS ? globalThis.SCRAPER_SETTINGS : {};\n  const serverUrl = dynamic.serverUrl !== void 0 && dynamic.serverUrl !== \"\" ? dynamic.serverUrl : CONFIG.serverUrl;\n  const username = dynamic.username !== void 0 && dynamic.username !== \"\" ? dynamic.username : CONFIG.username;\n  const password = dynamic.password !== void 0 && dynamic.password !== \"\" ? dynamic.password : CONFIG.password;\n  const debugMode = dynamic.debugMode !== void 0 ? Boolean(dynamic.debugMode) : CONFIG.debugMode;\n  let apiKey = dynamic.apiKey !== void 0 && dynamic.apiKey !== \"\" ? dynamic.apiKey : CONFIG.apiKey;\n  let userId = dynamic.userId !== void 0 && dynamic.userId !== \"\" ? dynamic.userId : CONFIG.userId;\n  if (username) {\n    apiKey = \"\";\n    userId = \"\";\n  }\n  return {\n    serverUrl: serverUrl || \"\",\n    username: username || \"\",\n    password: password || \"\",\n    apiKey: apiKey || \"\",\n    userId: userId || \"\",\n    debugMode: Boolean(debugMode)\n  };\n}\nfunction sanitizeUrl(url) {\n  if (!url) return \"\";\n  let clean = String(url).trim().replace(/\\/+$/, \"\");\n  if (!/^https?:\\/\\//i.test(clean)) {\n    clean = `http://${clean}`;\n  }\n  return clean.replace(/\\/+$/, \"\");\n}\nfunction getServerInfo(serverUrl, apiKey) {\n  return __async(this, null, function* () {\n    const now = Date.now();\n    if (serverInfoCache.serverUrl === serverUrl && serverInfoCache.timestamp && now - serverInfoCache.timestamp < 12 * 60 * 60 * 1e3) {\n      return serverInfoCache;\n    }\n    const isUrlEndingWithEmby = /\\/emby\\/?$/i.test(serverUrl);\n    const prefixes = isUrlEndingWithEmby ? [\"\"] : [\"\", \"/emby\"];\n    for (const p of prefixes) {\n      const url = `${serverUrl}${p}/System/Info/Public`;\n      try {\n        const res = yield fetch(url, { headers: getAuthHeaders(apiKey) });\n        if (res && res.ok) {\n          const data = yield res.json();\n          const prod = (data && (data.ProductName || data.ServerName) || \"\").toLowerCase();\n          const isJellyfin = prod.includes(\"jellyfin\");\n          const serverType = isJellyfin ? \"jellyfin\" : \"emby\";\n          const serverName = data && data.ServerName || (isJellyfin ? \"Jellyfin Server\" : \"Emby Server\");\n          let prefix = p;\n          if (isJellyfin) {\n            prefix = \"\";\n          } else if (!prefix && !isUrlEndingWithEmby) {\n            prefix = \"/emby\";\n          }\n          serverInfoCache = {\n            serverUrl,\n            prefix,\n            serverType,\n            serverName,\n            timestamp: now\n          };\n          return serverInfoCache;\n        }\n      } catch (e) {\n      }\n    }\n    const isJellyfinHint = serverUrl.toLowerCase().includes(\"jellyfin\");\n    const fallbackType = isJellyfinHint ? \"jellyfin\" : \"emby\";\n    const fallbackPrefix = fallbackType === \"jellyfin\" || isUrlEndingWithEmby ? \"\" : \"/emby\";\n    serverInfoCache = {\n      serverUrl,\n      prefix: fallbackPrefix,\n      serverType: fallbackType,\n      serverName: fallbackType === \"jellyfin\" ? \"Jellyfin Server\" : \"Emby Server\",\n      timestamp: now\n    };\n    return serverInfoCache;\n  });\n}\nfunction normalizeLanguage(lang) {\n  if (!lang) return \"und\";\n  const clean = String(lang).toLowerCase().trim();\n  if (clean.length === 2) return clean;\n  if (LANG_MAP[clean]) return LANG_MAP[clean];\n  if (clean.length === 3) return clean.substring(0, 2);\n  return clean;\n}\nfunction getLangFlag(lang) {\n  const code = normalizeLanguage(lang).toLowerCase();\n  const flags = {\n    tr: \"\\u{1F1F9}\\u{1F1F7}\",\n    en: \"\\u{1F1EC}\\u{1F1E7}\",\n    fr: \"\\u{1F1EB}\\u{1F1F7}\",\n    de: \"\\u{1F1E9}\\u{1F1EA}\",\n    es: \"\\u{1F1EA}\\u{1F1F8}\",\n    it: \"\\u{1F1EE}\\u{1F1F9}\",\n    ru: \"\\u{1F1F7}\\u{1F1FA}\",\n    ja: \"\\u{1F1EF}\\u{1F1F5}\",\n    ko: \"\\u{1F1F0}\\u{1F1F7}\",\n    zh: \"\\u{1F1E8}\\u{1F1F3}\",\n    ar: \"\\u{1F1F8}\\u{1F1E6}\",\n    pt: \"\\u{1F1F5}\\u{1F1F9}\",\n    nl: \"\\u{1F1F3}\\u{1F1F1}\",\n    pl: \"\\u{1F1F5}\\u{1F1F1}\",\n    sv: \"\\u{1F1F8}\\u{1F1EA}\",\n    no: \"\\u{1F1F3}\\u{1F1F4}\",\n    da: \"\\u{1F1E9}\\u{1F1F0}\",\n    fi: \"\\u{1F1EB}\\u{1F1EE}\",\n    el: \"\\u{1F1EC}\\u{1F1F7}\",\n    he: \"\\u{1F1EE}\\u{1F1F1}\",\n    hi: \"\\u{1F1EE}\\u{1F1F3}\",\n    hu: \"\\u{1F1ED}\\u{1F1FA}\",\n    id: \"\\u{1F1EE}\\u{1F1E9}\",\n    ro: \"\\u{1F1F7}\\u{1F1F4}\",\n    uk: \"\\u{1F1FA}\\u{1F1E6}\",\n    vi: \"\\u{1F1FB}\\u{1F1F3}\",\n    az: \"\\u{1F1E6}\\u{1F1FF}\",\n    bg: \"\\u{1F1E7}\\u{1F1EC}\",\n    cs: \"\\u{1F1E8}\\u{1F1FF}\"\n  };\n  return flags[code] || \"\\u{1F310}\";\n}\nfunction parseInputId(id, season, episode) {\n  let raw = \"\";\n  let parsedSeason = season !== void 0 && season !== null && season !== \"\" ? Number(season) : void 0;\n  let parsedEpisode = episode !== void 0 && episode !== null && episode !== \"\" ? Number(episode) : void 0;\n  if (typeof id === \"object\" && id !== null) {\n    raw = id.id || id.tmdbId || id.tmdb_id || id.imdbId || id.imdb_id || id.mediaId || id.title || \"\";\n    if (parsedSeason === void 0 && (id.season !== void 0 || id.seasonNumber !== void 0)) {\n      parsedSeason = Number(id.season !== void 0 ? id.season : id.seasonNumber);\n    }\n    if (parsedEpisode === void 0 && (id.episode !== void 0 || id.episodeNumber !== void 0)) {\n      parsedEpisode = Number(id.episode !== void 0 ? id.episode : id.episodeNumber);\n    }\n  } else {\n    raw = String(id || \"\").trim();\n  }\n  let isDirectEmby = false;\n  if (/^emby:(item:)?([a-zA-Z0-9_\\-]+)/i.test(raw)) {\n    const match = raw.match(/^emby:(item:)?([a-zA-Z0-9_\\-]+)/i);\n    raw = match[2];\n    isDirectEmby = true;\n  }\n  if (!isDirectEmby && raw.includes(\":\")) {\n    const parts = raw.split(\":\");\n    const firstPart = parts[0].toLowerCase();\n    if (firstPart === \"tmdb\" || firstPart === \"imdb\" || firstPart === \"movie\" || firstPart === \"tv\" || firstPart === \"series\") {\n      parts.shift();\n    }\n    if (parts.length >= 3) {\n      raw = parts[0];\n      if (parsedSeason === void 0 || isNaN(parsedSeason)) parsedSeason = Number(parts[1]);\n      if (parsedEpisode === void 0 || isNaN(parsedEpisode)) parsedEpisode = Number(parts[2]);\n    } else if (parts.length === 2) {\n      raw = parts[0];\n      if (parsedSeason === void 0 || isNaN(parsedSeason)) parsedSeason = Number(parts[1]);\n    } else if (parts.length === 1) {\n      raw = parts[0];\n    }\n  }\n  raw = raw.replace(/^(tmdb|imdb|movie|tv|series):/i, \"\").trim();\n  const isImdb = !isDirectEmby && /^tt\\d+/i.test(raw);\n  return {\n    cleanId: raw,\n    season: parsedSeason,\n    episode: parsedEpisode,\n    isImdb,\n    isDirectEmby\n  };\n}\nfunction getQualityTag(videoStream) {\n  if (!videoStream) return \"Unknown\";\n  const height = Number(videoStream.Height) || 0;\n  const width = Number(videoStream.Width) || 0;\n  const displayTitle = videoStream.DisplayTitle || \"\";\n  const resolutionMatch = displayTitle.match(/\\b(\\d+k|4k|2160p|1440p|1080p|720p|576p|480p|sd)\\b/i);\n  if (resolutionMatch) {\n    const resolution = resolutionMatch[1].toUpperCase();\n    if (resolution.includes(\"4K\") || resolution.includes(\"2160\")) return \"4K\";\n    if (resolution.includes(\"1440\")) return \"1440p\";\n    if (resolution.includes(\"1080\")) return \"1080p\";\n    if (resolution.includes(\"720\")) return \"720p\";\n    if (resolution.includes(\"576\")) return \"576p\";\n    if (resolution.includes(\"480\")) return \"480p\";\n    if (resolution.includes(\"SD\")) return \"SD\";\n  }\n  if (!width && !height) return \"Unknown\";\n  if (width >= 3840 || height >= 2160) {\n    if (width >= 4096) return \"4K DCI\";\n    if (width >= 3840) return \"4K\";\n    return \"2160p\";\n  }\n  if (height >= 1440) return \"1440p\";\n  if (height >= 1080) return \"1080p\";\n  if (height >= 720) return \"720p\";\n  if (height >= 576) return \"576p\";\n  if (height >= 480) return \"480p\";\n  return \"SD\";\n}\nfunction detectQuality(videoStream) {\n  const q = getQualityTag(videoStream);\n  const resOrder = {\n    \"4K DCI\": 100,\n    \"4K\": 100,\n    \"2160p\": 100,\n    \"1440p\": 80,\n    \"1080p\": 60,\n    \"720p\": 40,\n    \"576p\": 30,\n    \"480p\": 20,\n    \"360p\": 15,\n    \"SD\": 10,\n    \"Unknown\": 10\n  };\n  return {\n    quality: q,\n    p: videoStream && videoStream.Height ? `${videoStream.Height}p` : q,\n    rank: resOrder[q] || 60\n  };\n}\nfunction getResolutionDimensions(videoStream) {\n  if (!videoStream) return null;\n  const width = videoStream.Width;\n  const height = videoStream.Height;\n  if (width && height) {\n    return `${width}x${height}`;\n  }\n  return null;\n}\nfunction getVideoTag(videoStream) {\n  if (!videoStream) return \"\";\n  const codec = (videoStream.Codec || \"\").toUpperCase();\n  const profile = videoStream.Profile || \"\";\n  const codecMap = {\n    \"H264\": \"H.264\",\n    \"AVC\": \"H.264\",\n    \"H265\": \"HEVC\",\n    \"HEVC\": \"HEVC\",\n    \"VP8\": \"VP8\",\n    \"VP9\": \"VP9\",\n    \"AV1\": \"AV1\",\n    \"MPEG2VIDEO\": \"MPEG-2\",\n    \"VC1\": \"VC-1\",\n    \"MPEG4\": \"MPEG-4\",\n    \"XVID\": \"XviD\"\n  };\n  const displayCodec = codecMap[codec] || codec || \"\";\n  if (profile && [\"Main10\", \"High10\", \"Main 10\"].some((p) => profile.includes(p))) {\n    return `${displayCodec} 10bit`;\n  }\n  if (Number(videoStream.BitDepth) >= 10 && !displayCodec.includes(\"10bit\")) {\n    return `${displayCodec} 10bit`;\n  }\n  return displayCodec;\n}\nfunction getHdrTag(videoStream) {\n  if (!videoStream) return null;\n  switch (videoStream.ExtendedVideoType) {\n    case \"Hdr10\":\n      return \"HDR10\";\n    case \"Hdr10Plus\":\n      return \"HDR10+\";\n    case \"HyperLogGamma\":\n      return \"HLG\";\n    case \"DolbyVision\":\n      return \"DV\";\n    default:\n      break;\n  }\n  if (videoStream.ColorTransfer === \"smpte2084\") return \"HDR10\";\n  if (videoStream.ColorTransfer === \"arib-std-b67\") return \"HLG\";\n  const raw = String(videoStream.VideoRange || \"\").toUpperCase();\n  if (raw.includes(\"DOVI\") || raw.includes(\"DOLBY VISION\") || raw.includes(\"DV\")) return \"DV\";\n  if (raw.includes(\"HDR10+\") || raw.includes(\"HDR 10+\")) return \"HDR10+\";\n  if (raw.includes(\"HDR10\") || raw.includes(\"HDR 10\")) return \"HDR10\";\n  if (raw.includes(\"HDR\")) return \"HDR\";\n  if (raw.includes(\"HLG\")) return \"HLG\";\n  if (videoStream.IsHDR === true) return \"HDR\";\n  return null;\n}\nfunction getAudioTag(audioStream) {\n  if (!audioStream) return \"\";\n  const codec = (audioStream.Codec || \"\").toUpperCase();\n  const channels = audioStream.Channels;\n  const title = (audioStream.DisplayTitle || \"\").toUpperCase();\n  const codecMap = {\n    \"AAC\": \"AAC\",\n    \"AC3\": \"DD\",\n    \"EAC3\": \"DD+\",\n    \"DTS\": \"DTS\",\n    \"DTSHD\": \"DTS-HD\",\n    \"TRUEHD\": \"TrueHD\",\n    \"FLAC\": \"FLAC\",\n    \"OPUS\": \"Opus\",\n    \"MP3\": \"MP3\",\n    \"VORBIS\": \"Vorbis\",\n    \"PCM\": \"PCM\"\n  };\n  let displayCodec = codecMap[codec] || codec || \"Unknown\";\n  if (codec === \"DTS\" && (title.includes(\"DTS-HD\") || title.includes(\"MA\") || title.includes(\"MASTER\"))) {\n    displayCodec = \"DTS-HD MA\";\n  } else if (codec === \"DTS\" && title.includes(\"DTS:X\")) {\n    displayCodec = \"DTS:X\";\n  }\n  if (title.includes(\"ATMOS\")) {\n    displayCodec = `${displayCodec} Atmos`;\n  }\n  let channelStr = \"\";\n  if (channels === 1) channelStr = \"Mono\";\n  else if (channels === 2) channelStr = \"2.0\";\n  else if (channels === 6) channelStr = \"5.1\";\n  else if (channels === 8) channelStr = \"7.1\";\n  else if (channels) channelStr = `${channels}ch`;\n  return channelStr ? `${displayCodec} ${channelStr}` : displayCodec;\n}\nfunction isRemux(source) {\n  if (!source) return false;\n  const path = (source.Path || \"\").toLowerCase();\n  const name = (source.Name || \"\").toLowerCase();\n  return path.includes(\"remux\") || name.includes(\"remux\");\n}\nfunction formatBitrate(bps) {\n  if (!bps || bps === 0) return null;\n  const mbps = (Number(bps) / 1e6).toFixed(1);\n  return `${mbps}Mbps`;\n}\nfunction formatFileSize(bytes) {\n  if (!bytes || bytes === 0) return null;\n  const units = [\"B\", \"KB\", \"MB\", \"GB\", \"TB\"];\n  let size = Number(bytes);\n  let unitIndex = 0;\n  while (size >= 1024 && unitIndex < units.length - 1) {\n    size /= 1024;\n    unitIndex++;\n  }\n  const decimals = unitIndex >= 3 ? 1 : 0;\n  return `${size.toFixed(decimals)}${units[unitIndex]}`;\n}\nfunction formatBytes(bytes) {\n  return formatFileSize(bytes) || \"\";\n}\nfunction buildStreamDescription(mediaInfo) {\n  const lines = [];\n  const resolutionLine = [];\n  if (mediaInfo.qualityTag && mediaInfo.qualityTag !== \"Unknown\") {\n    resolutionLine.push(mediaInfo.qualityTag);\n  }\n  if (mediaInfo.resolutionDimensions) {\n    resolutionLine.push(mediaInfo.resolutionDimensions);\n  }\n  if (resolutionLine.length > 0) {\n    lines.push(resolutionLine.join(\" \\u2022 \"));\n  }\n  const typeLine = [];\n  if (mediaInfo.hdrTag) {\n    typeLine.push(mediaInfo.hdrTag);\n  }\n  if (mediaInfo.videoTag) {\n    typeLine.push(mediaInfo.videoTag);\n  }\n  if (typeLine.length > 0) {\n    lines.push(typeLine.join(\" \\u2022 \"));\n  }\n  if (mediaInfo.isRemux) {\n    lines.push(\"REMUX\");\n  }\n  if (mediaInfo.audioTag) {\n    lines.push(mediaInfo.audioTag);\n  }\n  const fileLine = [];\n  if (mediaInfo.container) {\n    fileLine.push(mediaInfo.container);\n  }\n  if (mediaInfo.bitrateFormatted) {\n    fileLine.push(mediaInfo.bitrateFormatted);\n  }\n  if (mediaInfo.sizeFormatted) {\n    fileLine.push(mediaInfo.sizeFormatted);\n  }\n  if (fileLine.length > 0) {\n    lines.push(fileLine.join(\" \\u2022 \"));\n  }\n  return lines.join(\"\\n\") || \"Stream Available\";\n}\nfunction extractSubtitles(serverUrl, prefixOrItemId, itemIdOrSource, sourceOrApiKey, apiKeyOrUndefined) {\n  let prefix = \"\";\n  let itemId = \"\";\n  let source = null;\n  let apiKey = \"\";\n  if (apiKeyOrUndefined !== void 0) {\n    prefix = prefixOrItemId || \"\";\n    itemId = itemIdOrSource;\n    source = sourceOrApiKey;\n    apiKey = apiKeyOrUndefined;\n  } else {\n    itemId = prefixOrItemId;\n    source = itemIdOrSource;\n    apiKey = sourceOrApiKey;\n    prefix = \"\";\n  }\n  const subtitles = [];\n  if (!source || !Array.isArray(source.MediaStreams)) return subtitles;\n  for (let i = 0; i < source.MediaStreams.length; i++) {\n    const stream = source.MediaStreams[i];\n    if (stream.Type !== \"Subtitle\") continue;\n    const codec = (stream.Codec || \"\").toLowerCase();\n    const isWebFormat = /^(subrip|srt|vtt|webvtt)$/i.test(codec);\n    const isExternal = Boolean(stream.IsExternal);\n    if (isExternal || isWebFormat) {\n      const subIndex = stream.Index !== void 0 ? stream.Index : i;\n      const langRaw = stream.Language || \"und\";\n      const lang = normalizeLanguage(langRaw);\n      const title = stream.DisplayTitle || stream.Title || stream.Language || \"Subtitle\";\n      const isForced = Boolean(stream.IsForced);\n      const isDefault = Boolean(stream.IsDefault);\n      let label = title;\n      if (isForced) label += \" [Forced]\";\n      if (isDefault) label += \" [Varsay\\u0131lan]\";\n      let subUrl = \"\";\n      if (stream.DeliveryUrl) {\n        subUrl = stream.DeliveryUrl.startsWith(\"http\") ? stream.DeliveryUrl : `${serverUrl}${stream.DeliveryUrl}`;\n      } else if (stream.IsExternal && stream.Path) {\n        subUrl = `${serverUrl}${prefix}/Videos/${itemId}/${source.Id}/Subtitles/${subIndex}/Stream.${stream.Codec || \"vtt\"}?api_key=${encodeURIComponent(apiKey)}`;\n      } else {\n        subUrl = `${serverUrl}${prefix}/Videos/${itemId}/${source.Id}/Subtitles/${subIndex}/Stream.vtt?api_key=${encodeURIComponent(apiKey)}`;\n      }\n      if (subUrl) {\n        subtitles.push({\n          url: subUrl,\n          lang,\n          label\n        });\n      }\n    }\n  }\n  return subtitles;\n}\nfunction authenticateEmby(serverUrl, username, password, logFn) {\n  return __async(this, null, function* () {\n    const now = Date.now();\n    if (authCache.accessToken && authCache.userId && authCache.serverUrl === serverUrl && authCache.username === username && authCache.password === password && now - authCache.timestamp < 12 * 60 * 60 * 1e3) {\n      if (logFn) logFn(\"Oturum: \\xD6nbellekten kullan\\u0131ld\\u0131\");\n      return {\n        apiKey: authCache.accessToken,\n        userId: authCache.userId\n      };\n    }\n    const authHeader = 'MediaBrowser Client=\"Nuvio\", Device=\"Nuvio Player\", DeviceId=\"nuvio-emby-player\", Version=\"3.6.0\"';\n    const endpoints = [\n      `${serverUrl}/Users/AuthenticateByName`,\n      `${serverUrl}/emby/Users/AuthenticateByName`\n    ];\n    for (const url of endpoints) {\n      try {\n        if (logFn) logFn(`Giri\\u015F yap\\u0131l\\u0131yor (${username})...`);\n        const res = yield fetch(url, {\n          method: \"POST\",\n          headers: {\n            \"Content-Type\": \"application/json\",\n            \"Accept\": \"application/json\",\n            \"X-Emby-Authorization\": authHeader,\n            \"Authorization\": authHeader\n          },\n          body: JSON.stringify({\n            Username: String(username).trim(),\n            Pw: password ? String(password) : \"\"\n          })\n        });\n        if (!res.ok) {\n          if (logFn) logFn(`Giri\\u015F ba\\u015Far\\u0131s\\u0131z: HTTP ${res.status}`);\n          continue;\n        }\n        const data = yield res.json();\n        if (!data || !data.AccessToken || !data.User || !data.User.Id) {\n          if (logFn) logFn(\"Giri\\u015F yan\\u0131t\\u0131nda AccessToken veya User.Id bulunamad\\u0131\");\n          continue;\n        }\n        authCache = {\n          serverUrl,\n          username,\n          password,\n          accessToken: data.AccessToken,\n          userId: data.User.Id,\n          timestamp: now\n        };\n        if (logFn) logFn(`Giri\\u015F ba\\u015Far\\u0131l\\u0131: ${data.User.Name || username}`);\n        return {\n          apiKey: data.AccessToken,\n          userId: data.User.Id\n        };\n      } catch (err) {\n        if (logFn) logFn(`Giri\\u015F hatas\\u0131: ${err.message || err}`);\n      }\n    }\n    return null;\n  });\n}\nfunction fetchTmdbMetadata(cleanId, isImdb, isTv) {\n  return __async(this, null, function* () {\n    var _a, _b, _c, _d, _e;\n    try {\n      if (isImdb) {\n        const url = `https://api.themoviedb.org/3/find/${cleanId}?external_source=imdb_id&api_key=${TMDB_PUBLIC_API_KEY}`;\n        const res = yield fetch(url);\n        if (!res.ok) return null;\n        const data = yield res.json();\n        const match = (isTv ? (_a = data.tv_results) == null ? void 0 : _a[0] : (_b = data.movie_results) == null ? void 0 : _b[0]) || ((_c = data.movie_results) == null ? void 0 : _c[0]) || ((_d = data.tv_results) == null ? void 0 : _d[0]);\n        if (!match) return null;\n        return {\n          tmdbId: match.id ? String(match.id) : null,\n          title: match.title || match.name || \"\",\n          originalTitle: match.original_title || match.original_name || \"\",\n          year: (match.release_date || match.first_air_date || \"\").split(\"-\")[0] || null\n        };\n      } else if (/^\\d+$/.test(cleanId)) {\n        const endpoint = isTv ? \"tv\" : \"movie\";\n        const url = `https://api.themoviedb.org/3/${endpoint}/${cleanId}?api_key=${TMDB_PUBLIC_API_KEY}`;\n        const res = yield fetch(url);\n        if (!res.ok) return null;\n        const data = yield res.json();\n        return {\n          tmdbId: cleanId,\n          imdbId: data.imdb_id || ((_e = data.external_ids) == null ? void 0 : _e.imdb_id) || null,\n          title: data.title || data.name || \"\",\n          originalTitle: data.original_title || data.original_name || \"\",\n          year: (data.release_date || data.first_air_date || \"\").split(\"-\")[0] || null\n        };\n      }\n    } catch (e) {\n      return null;\n    }\n    return null;\n  });\n}\nfunction searchEmbyItem(serverUrl, prefix, userId, apiKey, idInfo, preferredType, logFn) {\n  return __async(this, null, function* () {\n    let actualPrefix = prefix;\n    let actualUserId = userId;\n    let actualApiKey = apiKey;\n    let actualIdInfo = idInfo;\n    let actualPreferredType = preferredType;\n    let actualLogFn = logFn;\n    if (typeof actualIdInfo === \"string\" || typeof actualPreferredType === \"function\" && !actualLogFn) {\n      actualLogFn = actualPreferredType;\n      actualPreferredType = actualIdInfo;\n      actualIdInfo = actualApiKey;\n      actualApiKey = actualUserId;\n      actualUserId = actualPrefix;\n      actualPrefix = \"\";\n    }\n    const { cleanId, isImdb } = actualIdInfo;\n    if (!cleanId) return null;\n    const isTv = actualPreferredType === \"Series\";\n    const typeFilter = actualPreferredType ? `&IncludeItemTypes=${encodeURIComponent(actualPreferredType)}` : \"\";\n    sendRemoteLog(\"SEARCH_START\", `Arama ba\\u015Flat\\u0131ld\\u0131: cleanId=${cleanId}, isImdb=${isImdb}, type=${actualPreferredType}`);\n    const providerQueries = isImdb ? [`imdb.${cleanId},Imdb.${cleanId}`, `tmdb.${cleanId},Tmdb.${cleanId}`] : [`tmdb.${cleanId},Tmdb.${cleanId}`, `TheMovieDb.${cleanId}`];\n    for (const q of providerQueries) {\n      const url = `${serverUrl}${actualPrefix}/Users/${actualUserId}/Items?AnyProviderIdEquals=${encodeURIComponent(q)}${typeFilter}&Recursive=true&api_key=${encodeURIComponent(actualApiKey)}`;\n      try {\n        const res = yield fetch(url, { headers: getAuthHeaders(actualApiKey) });\n        if (!res.ok) continue;\n        const data = yield res.json();\n        if (data && Array.isArray(data.Items) && data.Items.length > 0) {\n          const matched = (actualPreferredType ? data.Items.find((i) => i.Type === actualPreferredType) : null) || data.Items[0];\n          if (actualLogFn) actualLogFn(`ProviderId (${q}) ile bulundu: ${matched.Name} (ID: ${matched.Id})`);\n          sendRemoteLog(\"SEARCH_FOUND\", `ProviderId ile bulundu: ${matched.Name} (ID: ${matched.Id}, Type: ${matched.Type})`);\n          return matched;\n        }\n      } catch (err) {\n        if (actualLogFn) actualLogFn(`Arama hatas\\u0131: ${err.message || err}`);\n        sendRemoteLog(\"SEARCH_ERROR\", `ProviderId arama hatas\\u0131 (${q}): ${err.message || err}`);\n      }\n    }\n    sendRemoteLog(\"SEARCH_FALLBACK\", `TMDB metadata sorgulan\\u0131yor: ${cleanId}`);\n    const meta = yield fetchTmdbMetadata(cleanId, isImdb, isTv);\n    if (meta) {\n      sendRemoteLog(\"TMDB_META\", `TMDB metadata al\\u0131nd\\u0131: \"${meta.title}\" (${meta.year}), tmdbId=${meta.tmdbId}, imdbId=${meta.imdbId}`);\n      const altQueries = [];\n      if (meta.tmdbId && meta.tmdbId !== cleanId) {\n        altQueries.push(`tmdb.${meta.tmdbId},Tmdb.${meta.tmdbId}`);\n      }\n      if (meta.imdbId && meta.imdbId !== cleanId) {\n        altQueries.push(`imdb.${meta.imdbId},Imdb.${meta.imdbId}`);\n      }\n      for (const altQ of altQueries) {\n        const url = `${serverUrl}${actualPrefix}/Users/${actualUserId}/Items?AnyProviderIdEquals=${encodeURIComponent(altQ)}${typeFilter}&Recursive=true&api_key=${encodeURIComponent(actualApiKey)}`;\n        try {\n          const res = yield fetch(url, { headers: getAuthHeaders(actualApiKey) });\n          if (res.ok) {\n            const data = yield res.json();\n            if (data && Array.isArray(data.Items) && data.Items.length > 0) {\n              const matched = (actualPreferredType ? data.Items.find((i) => i.Type === actualPreferredType) : null) || data.Items[0];\n              if (actualLogFn) actualLogFn(`Alternatif ID (${altQ}) ile bulundu: ${matched.Name} (ID: ${matched.Id})`);\n              sendRemoteLog(\"SEARCH_FOUND\", `Alternatif ID ile bulundu: ${matched.Name} (ID: ${matched.Id})`);\n              return matched;\n            }\n          }\n        } catch (e) {\n        }\n      }\n      const titles = [meta.title, meta.originalTitle].filter(Boolean);\n      for (const title of titles) {\n        const url = `${serverUrl}${actualPrefix}/Users/${actualUserId}/Items?SearchTerm=${encodeURIComponent(title)}${typeFilter}&Recursive=true&api_key=${encodeURIComponent(actualApiKey)}`;\n        try {\n          const res = yield fetch(url, { headers: getAuthHeaders(actualApiKey) });\n          if (res.ok) {\n            const data = yield res.json();\n            if (data && Array.isArray(data.Items) && data.Items.length > 0) {\n              const matched = meta.year ? data.Items.find((item) => String(item.ProductionYear) === String(meta.year) && item.Type === actualPreferredType) || data.Items.find((item) => String(item.ProductionYear) === String(meta.year)) || data.Items[0] : (actualPreferredType ? data.Items.find((i) => i.Type === actualPreferredType) : null) || data.Items[0];\n              if (actualLogFn) actualLogFn(`Ba\\u015Fl\\u0131k ile bulundu (${title}): ${matched.Name} (ID: ${matched.Id})`);\n              sendRemoteLog(\"SEARCH_FOUND\", `Ba\\u015Fl\\u0131k ile bulundu: ${matched.Name} (ID: ${matched.Id})`);\n              return matched;\n            }\n          }\n        } catch (e) {\n        }\n      }\n    }\n    try {\n      const url = `${serverUrl}${actualPrefix}/Users/${actualUserId}/Items?SearchTerm=${encodeURIComponent(cleanId)}${typeFilter}&Recursive=true&api_key=${encodeURIComponent(actualApiKey)}`;\n      const res = yield fetch(url, { headers: getAuthHeaders(actualApiKey) });\n      if (res.ok) {\n        const data = yield res.json();\n        if (data && Array.isArray(data.Items) && data.Items.length > 0) {\n          const matched = (actualPreferredType ? data.Items.find((i) => i.Type === actualPreferredType) : null) || data.Items[0];\n          if (actualLogFn) actualLogFn(`SearchTerm ile bulundu: ${matched.Name} (ID: ${matched.Id})`);\n          sendRemoteLog(\"SEARCH_FOUND\", `SearchTerm ile bulundu: ${matched.Name} (ID: ${matched.Id})`);\n          return matched;\n        }\n      }\n    } catch (e) {\n    }\n    if (actualLogFn) actualLogFn(`Sunucuda e\\u015Fle\\u015Fen \\xF6\\u011Fe bulunamad\\u0131 (ID: ${cleanId})`);\n    sendRemoteLog(\"SEARCH_NOT_FOUND\", `Sunucuda e\\u015Fle\\u015Fen \\xF6\\u011Fe bulunamad\\u0131 (ID: ${cleanId}, Type: ${actualPreferredType})`);\n    return null;\n  });\n}\nfunction findEpisode(serverUrl, prefix, apiKey, seriesId, season, episode, userId, logFn) {\n  return __async(this, null, function* () {\n    let actualPrefix = prefix;\n    let actualApiKey = apiKey;\n    let actualSeriesId = seriesId;\n    let actualSeason = season;\n    let actualEpisode = episode;\n    let actualUserId = userId;\n    let actualLogFn = logFn;\n    if (typeof actualUserId === \"function\" && !actualLogFn) {\n      actualLogFn = actualUserId;\n      actualUserId = actualEpisode;\n      actualEpisode = actualSeason;\n      actualSeason = actualSeriesId;\n      actualSeriesId = actualApiKey;\n      actualApiKey = actualPrefix;\n      actualPrefix = \"\";\n    }\n    const targetSeason = Number(actualSeason);\n    const targetEpisode = Number(actualEpisode);\n    const seasonQuery = !isNaN(targetSeason) ? `Season=${targetSeason}&` : \"\";\n    const userQuery = actualUserId ? `UserId=${encodeURIComponent(actualUserId)}&` : \"\";\n    const url = `${serverUrl}${actualPrefix}/Shows/${actualSeriesId}/Episodes?${seasonQuery}${userQuery}api_key=${encodeURIComponent(actualApiKey)}`;\n    try {\n      const res = yield fetch(url, {\n        method: \"GET\",\n        headers: getAuthHeaders(actualApiKey)\n      });\n      if (!res.ok) {\n        if (actualLogFn) actualLogFn(`B\\xF6l\\xFCm listesi al\\u0131namad\\u0131: HTTP ${res.status}`);\n        sendRemoteLog(\"EPISODE_ERROR\", `B\\xF6l\\xFCm listesi al\\u0131namad\\u0131: HTTP ${res.status}`);\n        return null;\n      }\n      const data = yield res.json();\n      if (!data || !Array.isArray(data.Items)) {\n        if (actualLogFn) actualLogFn(\"B\\xF6l\\xFCm listesi bo\\u015F d\\xF6nd\\xFC\");\n        sendRemoteLog(\"EPISODE_NOT_FOUND\", \"B\\xF6l\\xFCm listesi bo\\u015F d\\xF6nd\\xFC\");\n        return null;\n      }\n      const matchedEpisode = data.Items.find((item) => {\n        const epNum = Number(item.IndexNumber);\n        const sNum = Number(item.ParentIndexNumber);\n        const matchesEpisode = !isNaN(targetEpisode) && epNum === targetEpisode;\n        const matchesSeason = isNaN(targetSeason) || isNaN(sNum) || sNum === targetSeason;\n        return matchesEpisode && matchesSeason;\n      });\n      if (matchedEpisode) {\n        if (actualLogFn) actualLogFn(`B\\xF6l\\xFCm bulundu: S${actualSeason}E${actualEpisode} - ${matchedEpisode.Name || \"B\\xF6l\\xFCm\"} (ID: ${matchedEpisode.Id})`);\n        sendRemoteLog(\"EPISODE_FOUND\", `B\\xF6l\\xFCm bulundu: S${actualSeason}E${actualEpisode} - ${matchedEpisode.Name || \"B\\xF6l\\xFCm\"} (ID: ${matchedEpisode.Id})`);\n        return matchedEpisode;\n      } else {\n        if (actualLogFn) actualLogFn(`B\\xF6l\\xFCm e\\u015Fle\\u015Fmedi (Aranan S${actualSeason}E${actualEpisode})`);\n        sendRemoteLog(\"EPISODE_NOT_FOUND\", `B\\xF6l\\xFCm e\\u015Fle\\u015Fmedi (Aranan S${actualSeason}E${actualEpisode})`);\n        return null;\n      }\n    } catch (err) {\n      if (actualLogFn) actualLogFn(`B\\xF6l\\xFCm arama hatas\\u0131: ${err.message || err}`);\n      sendRemoteLog(\"EPISODE_ERROR\", `B\\xF6l\\xFCm arama hatas\\u0131: ${err.message || err}`);\n      return null;\n    }\n  });\n}\nfunction getPlaybackInfo(serverUrl, prefix, userId, apiKey, itemId, logFn) {\n  return __async(this, null, function* () {\n    let actualPrefix = prefix;\n    let actualUserId = userId;\n    let actualApiKey = apiKey;\n    let actualItemId = itemId;\n    let actualLogFn = logFn;\n    if (typeof actualItemId === \"function\" && !actualLogFn) {\n      actualLogFn = actualItemId;\n      actualItemId = actualApiKey;\n      actualApiKey = actualUserId;\n      actualUserId = actualPrefix;\n      actualPrefix = \"\";\n    }\n    const endpoints = [\n      `${serverUrl}${actualPrefix}/Items/${actualItemId}/PlaybackInfo?api_key=${encodeURIComponent(actualApiKey)}&UserId=${encodeURIComponent(actualUserId)}`,\n      `${serverUrl}${actualPrefix}/Users/${actualUserId}/Items/${actualItemId}/PlaybackInfo?api_key=${encodeURIComponent(actualApiKey)}`,\n      `${serverUrl}/Items/${actualItemId}/PlaybackInfo?api_key=${encodeURIComponent(actualApiKey)}&UserId=${encodeURIComponent(actualUserId)}`\n    ];\n    for (const url of endpoints) {\n      try {\n        const res = yield fetch(url, {\n          method: \"POST\",\n          headers: Object.assign({ \"Content-Type\": \"application/json\" }, getAuthHeaders(actualApiKey)),\n          body: JSON.stringify({\n            UserId: actualUserId,\n            StartTimeTicks: 0,\n            IsPlayback: false,\n            AutoOpenLiveStream: false\n          })\n        });\n        if (!res.ok) continue;\n        const data = yield res.json();\n        if (data && Array.isArray(data.MediaSources) && data.MediaSources.length > 0) {\n          if (actualLogFn) actualLogFn(`PlaybackInfo al\\u0131nd\\u0131: ${data.MediaSources.length} kaynak`);\n          return data;\n        }\n      } catch (err) {\n      }\n    }\n    try {\n      const itemUrl = `${serverUrl}${actualPrefix}/Users/${actualUserId}/Items/${actualItemId}?api_key=${encodeURIComponent(actualApiKey)}`;\n      const res = yield fetch(itemUrl, {\n        method: \"GET\",\n        headers: getAuthHeaders(actualApiKey)\n      });\n      if (res.ok) {\n        const itemData = yield res.json();\n        if (itemData && Array.isArray(itemData.MediaSources) && itemData.MediaSources.length > 0) {\n          if (actualLogFn) actualLogFn(`\\xD6\\u011Fe detay\\u0131ndan MediaSources al\\u0131nd\\u0131: ${itemData.MediaSources.length} kaynak`);\n          return itemData;\n        }\n      }\n    } catch (err) {\n    }\n    if (actualLogFn) actualLogFn(\"PlaybackInfo kaynak bulamad\\u0131\");\n    return null;\n  });\n}\nfunction getStreams(tmdbId, mediaType, season, episode) {\n  return __async(this, null, function* () {\n    const logs = [];\n    const log = (msg) => {\n      console.log(`[Emby Provider] ${msg}`);\n      logs.push(msg);\n    };\n    let detectedMediaType = mediaType;\n    if (typeof tmdbId === \"object\" && tmdbId !== null) {\n      if (!detectedMediaType && (tmdbId.mediaType || tmdbId.type)) {\n        detectedMediaType = tmdbId.mediaType || tmdbId.type;\n      }\n    }\n    const idInfo = parseInputId(tmdbId, season, episode);\n    const targetSeason = idInfo.season !== void 0 ? idInfo.season : season;\n    const targetEpisode = idInfo.episode !== void 0 ? idInfo.episode : episode;\n    log(`v3.6.0 \\xE7al\\u0131\\u015Ft\\u0131 (ID: ${JSON.stringify(tmdbId)} -> ${idInfo.cleanId}, T\\xFCr: ${detectedMediaType}, S: ${targetSeason}, E: ${targetEpisode})`);\n    sendRemoteLog(\"GET_STREAMS\", `getStreams \\xE7a\\u011Fr\\u0131ld\\u0131: ID=${JSON.stringify(tmdbId)} (${idInfo.cleanId})`, {\n      rawId: tmdbId,\n      cleanId: idInfo.cleanId,\n      isImdb: idInfo.isImdb,\n      mediaType: detectedMediaType,\n      targetSeason,\n      targetEpisode\n    });\n    try {\n      const activeConfig2 = getActiveConfig();\n      const serverUrl = sanitizeUrl(activeConfig2.serverUrl);\n      let { apiKey, userId } = activeConfig2;\n      if (!serverUrl) {\n        log(\"HATA: Sunucu adresi bo\\u015F!\");\n        sendRemoteLog(\"ERROR\", \"Sunucu adresi bo\\u015F!\");\n        return activeConfig2.debugMode ? [{\n          name: \"[Emby Te\\u015Fhis] Sunucu Adresi Bo\\u015F\",\n          title: \"Ayarlardan Emby veya Jellyfin sunucu adresinizi girin\",\n          url: \"http://localhost\",\n          quality: \"HATA\"\n        }] : [];\n      }\n      if (!apiKey && activeConfig2.username) {\n        sendRemoteLog(\"AUTH_START\", `Giri\\u015F yap\\u0131l\\u0131yor: ${activeConfig2.username} -> ${serverUrl}`);\n        const auth = yield authenticateEmby(serverUrl, activeConfig2.username, activeConfig2.password, log);\n        if (!auth) {\n          sendRemoteLog(\"AUTH_FAIL\", `Giri\\u015F ba\\u015Far\\u0131s\\u0131z: ${logs.slice(-2).join(\" \\u2022 \")}`);\n          return activeConfig2.debugMode ? [{\n            name: \"[Emby Te\\u015Fhis] Giri\\u015F Ba\\u015Far\\u0131s\\u0131z\",\n            title: logs.slice(-2).join(\" \\u2022 \"),\n            url: serverUrl,\n            quality: \"HATA\"\n          }] : [];\n        }\n        apiKey = auth.apiKey;\n        userId = auth.userId;\n        sendRemoteLog(\"AUTH_SUCCESS\", `Giri\\u015F ba\\u015Far\\u0131l\\u0131: User ID ${userId}`);\n      }\n      if (!apiKey || !userId) {\n        log(\"HATA: API anahtar\\u0131 veya Kullan\\u0131c\\u0131 ID al\\u0131namad\\u0131!\");\n        sendRemoteLog(\"AUTH_FAIL\", \"API anahtar\\u0131 veya Kullan\\u0131c\\u0131 ID al\\u0131namad\\u0131!\");\n        return activeConfig2.debugMode ? [{\n          name: \"[Emby Te\\u015Fhis] Yetkilendirme Ba\\u015Far\\u0131s\\u0131z\",\n          title: logs.slice(-2).join(\" \\u2022 \"),\n          url: serverUrl,\n          quality: \"HATA\"\n        }] : [];\n      }\n      const serverInfo = yield getServerInfo(serverUrl, apiKey);\n      const prefix = serverInfo.prefix || \"\";\n      const streamProviderName = serverInfo.serverType === \"jellyfin\" ? \"Jellyfin\" : \"Emby\";\n      if (!idInfo.cleanId) {\n        log(\"HATA: ID parametresi bo\\u015F!\");\n        sendRemoteLog(\"ERROR\", \"ID parametresi bo\\u015F!\");\n        return [];\n      }\n      let isTv = detectedMediaType === \"tv\" || detectedMediaType === \"series\" || detectedMediaType === \"show\";\n      if (!isTv && (targetSeason !== void 0 || targetEpisode !== void 0)) {\n        isTv = true;\n      }\n      let targetItemId = null;\n      let matchedItemName = \"\";\n      let matchedItemYear = \"\";\n      if (idInfo.isDirectEmby && idInfo.cleanId) {\n        targetItemId = idInfo.cleanId;\n        matchedItemName = \"Emby / Jellyfin Medya\";\n        log(`Do\\u011Frudan Emby/Jellyfin Item ID kullan\\u0131l\\u0131yor: ${targetItemId}`);\n        sendRemoteLog(\"DIRECT_ITEM\", `Do\\u011Frudan Item ID kullan\\u0131ld\\u0131: ${targetItemId}`);\n      } else if (isTv) {\n        const seasonNum = targetSeason !== void 0 ? targetSeason : 1;\n        const episodeNum = targetEpisode !== void 0 ? targetEpisode : 1;\n        let seriesItem = yield searchEmbyItem(serverUrl, prefix, userId, apiKey, idInfo, \"Series\", log);\n        if (!seriesItem) {\n          const movieFallback = yield searchEmbyItem(serverUrl, prefix, userId, apiKey, idInfo, \"Movie\", log);\n          if (movieFallback) {\n            targetItemId = movieFallback.Id;\n            matchedItemName = movieFallback.Name || \"Film\";\n            matchedItemYear = movieFallback.ProductionYear ? String(movieFallback.ProductionYear) : \"\";\n          }\n        }\n        if (seriesItem && seriesItem.Id) {\n          matchedItemName = seriesItem.Name || \"Dizi\";\n          matchedItemYear = seriesItem.ProductionYear ? String(seriesItem.ProductionYear) : \"\";\n          const episodeItem = yield findEpisode(serverUrl, prefix, apiKey, seriesItem.Id, seasonNum, episodeNum, userId, log);\n          if (episodeItem && episodeItem.Id) {\n            targetItemId = episodeItem.Id;\n          }\n        }\n      } else {\n        let movieItem = yield searchEmbyItem(serverUrl, prefix, userId, apiKey, idInfo, \"Movie\", log);\n        if (!movieItem) {\n          const seriesFallback = yield searchEmbyItem(serverUrl, prefix, userId, apiKey, idInfo, \"Series\", log);\n          if (seriesFallback && seriesFallback.Id) {\n            matchedItemName = seriesFallback.Name || \"Dizi\";\n            matchedItemYear = seriesFallback.ProductionYear ? String(seriesFallback.ProductionYear) : \"\";\n            const episodeItem = yield findEpisode(serverUrl, prefix, apiKey, seriesFallback.Id, 1, 1, userId, log);\n            if (episodeItem && episodeItem.Id) {\n              targetItemId = episodeItem.Id;\n            }\n          }\n        } else {\n          matchedItemName = movieItem.Name || \"Film\";\n          matchedItemYear = movieItem.ProductionYear ? String(movieItem.ProductionYear) : \"\";\n          targetItemId = movieItem.Id;\n        }\n      }\n      if (!targetItemId) {\n        log(`${streamProviderName}'de e\\u015Fle\\u015Fen medya bulunamad\\u0131 (ID: ${idInfo.cleanId})`);\n        sendRemoteLog(\"MEDIA_NOT_FOUND\", `${streamProviderName}'de e\\u015Fle\\u015Fen medya bulunamad\\u0131 (ID: ${idInfo.cleanId})`);\n        if (activeConfig2.debugMode) {\n          return [{\n            name: `[${streamProviderName} Te\\u015Fhis] Ar\\u015Fivde Bulunamad\\u0131`,\n            title: `ID: ${idInfo.cleanId} ${streamProviderName} ar\\u015Fivinizde e\\u015Fle\\u015Fmedi`,\n            url: serverUrl,\n            quality: \"B\\u0130LG\\u0130\"\n          }];\n        }\n        return [];\n      }\n      sendRemoteLog(\"TARGET_ITEM\", `Hedef medya belirlendi: \"${matchedItemName}\" (Item ID: ${targetItemId})`);\n      sendRemoteLog(\"PLAYBACK_INFO\", `PlaybackInfo al\\u0131n\\u0131yor (Item ID: ${targetItemId})`);\n      const playbackData = yield getPlaybackInfo(serverUrl, prefix, userId, apiKey, targetItemId, log);\n      if (!playbackData || !Array.isArray(playbackData.MediaSources) || playbackData.MediaSources.length === 0) {\n        log(`Item ${targetItemId} i\\xE7in oynat\\u0131labilir kaynak bulunamad\\u0131`);\n        sendRemoteLog(\"NO_SOURCES\", `Item ${targetItemId} (${matchedItemName}) i\\xE7in MediaSource bulunamad\\u0131!`);\n        if (activeConfig2.debugMode) {\n          return [{\n            name: `[${streamProviderName} Te\\u015Fhis] Kaynak Yok`,\n            title: `${matchedItemName} i\\xE7in MediaSource bulunamad\\u0131`,\n            url: serverUrl,\n            quality: \"B\\u0130LG\\u0130\"\n          }];\n        }\n        return [];\n      }\n      const resOrder = {\n        \"4K DCI\": 0,\n        \"4K\": 1,\n        \"2160p\": 2,\n        \"1440p\": 3,\n        \"1080p\": 4,\n        \"720p\": 5,\n        \"576p\": 6,\n        \"480p\": 7,\n        \"360p\": 8,\n        \"SD\": 9,\n        \"Unknown\": 10\n      };\n      const sortedSources = playbackData.MediaSources.slice().sort((a, b) => {\n        const vA = (a.MediaStreams || []).find((s) => s.Type === \"Video\");\n        const vB = (b.MediaStreams || []).find((s) => s.Type === \"Video\");\n        const qA = getQualityTag(vA);\n        const qB = getQualityTag(vB);\n        const rA = resOrder[qA] !== void 0 ? resOrder[qA] : 10;\n        const rB = resOrder[qB] !== void 0 ? resOrder[qB] : 10;\n        if (rA !== rB) return rA - rB;\n        const hdrA = getHdrTag(vA) ? 1 : 0;\n        const hdrB = getHdrTag(vB) ? 1 : 0;\n        if (hdrA !== hdrB) return hdrB - hdrA;\n        const remuxA = isRemux(a) ? 1 : 0;\n        const remuxB = isRemux(b) ? 1 : 0;\n        if (remuxA !== remuxB) return remuxB - remuxA;\n        const sizeA = Number(a.Size) || Number(a.Bitrate) || 0;\n        const sizeB = Number(b.Size) || Number(b.Bitrate) || 0;\n        return sizeB - sizeA;\n      });\n      const streams = [];\n      for (const source of sortedSources) {\n        if (!source || !source.Id) continue;\n        const mediaStreams = source.MediaStreams || [];\n        const videoStream = mediaStreams.find((s) => s.Type === \"Video\");\n        const audioStream = mediaStreams.find((s) => s.Type === \"Audio\" && s.IsDefault) || mediaStreams.find((s) => s.Type === \"Audio\");\n        const qualityTag = getQualityTag(videoStream);\n        const dimensions = getResolutionDimensions(videoStream);\n        const hdrTag = getHdrTag(videoStream);\n        const videoTag = getVideoTag(videoStream);\n        const isRemuxSource = isRemux(source);\n        const audioTag = getAudioTag(audioStream);\n        const container = (source.Container || \"mp4\").toUpperCase();\n        const bitrateFormatted = formatBitrate(source.Bitrate || videoStream && videoStream.BitRate);\n        const sizeFormatted = formatFileSize(source.Size);\n        const mediaInfo = {\n          qualityTag,\n          resolutionDimensions: dimensions,\n          hdrTag,\n          videoTag,\n          isRemux: isRemuxSource,\n          audioTag,\n          container,\n          bitrateFormatted,\n          sizeFormatted\n        };\n        const streamDescription = buildStreamDescription(mediaInfo);\n        const filename = source.Path ? source.Path.split(/[\\\\/]/).pop() : source.Name || \"stream\";\n        const streamUrl = `${serverUrl}${prefix}/Videos/${targetItemId}/stream.${container.toLowerCase()}?static=true&MediaSourceId=${encodeURIComponent(source.Id)}&api_key=${encodeURIComponent(apiKey)}`;\n        const subtitles = extractSubtitles(serverUrl, prefix, targetItemId, source, apiKey);\n        const techDetails = [dimensions, hdrTag, videoTag, audioTag, container, bitrateFormatted].filter(Boolean).join(\" \\u2022 \");\n        streams.push({\n          name: streamProviderName,\n          title: streamDescription,\n          description: streamDescription,\n          url: streamUrl,\n          quality: qualityTag,\n          size: sizeFormatted || \"\",\n          language: techDetails || \"\",\n          provider: serverInfo.serverType || \"emby\",\n          type: container.toLowerCase(),\n          headers: {\n            \"X-Emby-Token\": apiKey,\n            \"X-MediaBrowser-Token\": apiKey\n          },\n          behaviorHints: {\n            filename,\n            videoSize: Number(source.Size) || void 0,\n            notWebReady: true,\n            bingeGroup: `${streamProviderName}-${(qualityTag || \"Direct Play\").trim()}`,\n            headers: {\n              \"X-Emby-Token\": apiKey,\n              \"X-MediaBrowser-Token\": apiKey\n            },\n            proxyHeaders: {\n              request: {\n                \"X-Emby-Token\": apiKey,\n                \"X-MediaBrowser-Token\": apiKey\n              }\n            }\n          },\n          subtitles\n        });\n      }\n      if (activeConfig2.debugMode && streams.length > 0) {\n        streams.unshift({\n          name: `[${streamProviderName} Te\\u015Fhis] Ba\\u011Flant\\u0131 Aktif`,\n          title: `${matchedItemName} \\u2022 ${streamProviderName} ID: ${targetItemId} (${streams.length} kaynak)`,\n          url: streams[0].url,\n          quality: \"TE\\u015EH\\u0130S\"\n        });\n      }\n      log(`${streams.length} ak\\u0131\\u015F ba\\u015Far\\u0131yla \\xFCretildi`);\n      sendRemoteLog(\"STREAMS_SUCCESS\", `${streams.length} adet ak\\u0131\\u015F \\xFCretildi (${matchedItemName})`, {\n        streamCount: streams.length,\n        firstStream: streams[0] ? { name: streams[0].name, title: streams[0].title, url: streams[0].url } : null\n      });\n      return streams;\n    } catch (error) {\n      const errMsg = error ? error.message || String(error) : \"Bilinmeyen hata\";\n      const errStack = error ? error.stack || \"\" : \"\";\n      console.error(\"[Emby Provider] getStreams beklenmeyen hata:\", errMsg, errStack);\n      sendRemoteLog(\"ERROR\", `getStreams Hatas\\u0131: ${errMsg}`, { stack: errStack, lastLogs: logs.slice(-2) });\n      if (activeConfig.debugMode) {\n        return [{\n          name: \"[Emby Hata] Beklenmeyen Hata\",\n          title: errMsg + \" | \" + logs.slice(-2).join(\" \\u2022 \"),\n          url: \"http://localhost\",\n          quality: \"HATA\"\n        }];\n      }\n      return [];\n    }\n  });\n}\nfunction onSettings() {\n  return __async(this, null, function* () {\n    sendRemoteLog(\"ON_SETTINGS\", \"Nuvio Ayarlar sayfas\\u0131 a\\xE7\\u0131ld\\u0131\", {\n      currentSettings: typeof globalThis !== \"undefined\" ? globalThis.SCRAPER_SETTINGS : null\n    });\n    return [\n      {\n        type: \"header\",\n        label: \"Emby / Jellyfin Sunucu Ba\\u011Flant\\u0131s\\u0131\"\n      },\n      {\n        type: \"text\",\n        key: \"serverUrl\",\n        label: \"Sunucu Adresi\",\n        description: \"\\xD6rn: http://192.168.1.100:8096 veya https://jellyfin.sunucunuz.com\",\n        defaultValue: CONFIG.serverUrl\n      },\n      {\n        type: \"text\",\n        key: \"username\",\n        label: \"Kullan\\u0131c\\u0131 Ad\\u0131\",\n        description: \"Emby veya Jellyfin kullan\\u0131c\\u0131 ad\\u0131n\\u0131z\",\n        defaultValue: CONFIG.username\n      },\n      {\n        type: \"text\",\n        key: \"password\",\n        label: \"\\u015Eifre\",\n        description: \"Emby veya Jellyfin kullan\\u0131c\\u0131 \\u015Fifreniz (hesab\\u0131n\\u0131z \\u015Fifresizse bo\\u015F b\\u0131rak\\u0131n)\",\n        defaultValue: CONFIG.password\n      },\n      {\n        type: \"toggle\",\n        key: \"debugMode\",\n        label: \"Hata Ay\\u0131klama Modu (Debug)\",\n        description: \"Ak\\u0131\\u015F listesinde Emby / Jellyfin ba\\u011Flant\\u0131 ve arama te\\u015Fhis kart\\u0131n\\u0131 g\\xF6sterir\",\n        defaultValue: false\n      }\n    ];\n  });\n}\nif (typeof module !== \"undefined\" && module.exports) {\n  module.exports = { getStreams, onSettings };\n  module.exports.default = { getStreams, onSettings };\n}\nif (typeof exports !== \"undefined\") {\n  exports.getStreams = getStreams;\n  exports.onSettings = onSettings;\n}\nif (typeof globalThis !== \"undefined\") {\n  globalThis.getStreams = getStreams;\n  globalThis.onSettings = onSettings;\n}\nif (typeof window !== \"undefined\") {\n  window.getStreams = getStreams;\n  window.onSettings = onSettings;\n}\nif (typeof global !== \"undefined\") {\n  global.getStreams = getStreams;\n  global.onSettings = onSettings;\n}\n";
const HTML_PAGE = "<!DOCTYPE html>\n<html lang=\"tr\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Nuvio Emby & Jellyfin - Kişisel Eklenti Yapılandırıcı</title>\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n  <link href=\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap\" rel=\"stylesheet\">\n  <script src=\"https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js\"></script>\n  <style>\n    :root {\n      --bg: #090d16;\n      --card-bg: rgba(18, 24, 38, 0.85);\n      --card-border: rgba(255, 255, 255, 0.08);\n      --accent-emby: #52B54B;\n      --accent-emby-hover: #439b3d;\n      --accent-nuvio: #6366f1;\n      --accent-gradient: linear-gradient(135deg, #52B54B 0%, #10b981 50%, #6366f1 100%);\n      --text: #f8fafc;\n      --text-muted: #94a3b8;\n      --input-bg: rgba(10, 15, 26, 0.7);\n      --input-border: rgba(255, 255, 255, 0.12);\n      --input-focus: #52B54B;\n      --error: #ef4444;\n      --success: #10b981;\n    }\n\n    * { box-sizing: border-box; margin: 0; padding: 0; }\n\n    body {\n      background-color: var(--bg);\n      background-image: \n        radial-gradient(at 0% 0%, rgba(82, 181, 75, 0.12) 0px, transparent 50%),\n        radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.12) 0px, transparent 50%);\n      color: var(--text);\n      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;\n      min-height: 100vh;\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      justify-content: center;\n      padding: 2rem 1rem;\n      line-height: 1.6;\n    }\n\n    .container { width: 100%; max-width: 640px; }\n    .header { text-align: center; margin-bottom: 2rem; }\n\n    .badge-row {\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      gap: 0.75rem;\n      margin-bottom: 1rem;\n    }\n\n    .badge {\n      display: inline-flex;\n      align-items: center;\n      gap: 0.4rem;\n      background: rgba(255, 255, 255, 0.06);\n      border: 1px solid var(--card-border);\n      border-radius: 9999px;\n      padding: 0.35rem 0.85rem;\n      font-size: 0.825rem;\n      font-weight: 600;\n      color: var(--text-muted);\n    }\n\n    .badge-dot {\n      width: 8px;\n      height: 8px;\n      border-radius: 50%;\n      background: var(--accent-emby);\n      box-shadow: 0 0 10px var(--accent-emby);\n    }\n\n    h1 {\n      font-size: 2.2rem;\n      font-weight: 800;\n      letter-spacing: -0.03em;\n      margin-bottom: 0.5rem;\n      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);\n      -webkit-background-clip: text;\n      -webkit-text-fill-color: transparent;\n    }\n\n    .subtitle { color: var(--text-muted); font-size: 0.95rem; }\n\n    .card {\n      background: var(--card-bg);\n      backdrop-filter: blur(16px);\n      -webkit-backdrop-filter: blur(16px);\n      border: 1px solid var(--card-border);\n      border-radius: 1.25rem;\n      padding: 2rem;\n      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);\n      margin-bottom: 1.5rem;\n    }\n\n    .form-group { margin-bottom: 1.25rem; }\n    .form-group:last-child { margin-bottom: 0; }\n\n    label {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      font-size: 0.875rem;\n      font-weight: 600;\n      margin-bottom: 0.5rem;\n      color: #e2e8f0;\n    }\n\n    .label-hint { font-size: 0.75rem; font-weight: 400; color: var(--text-muted); }\n\n    .input-wrapper { position: relative; display: flex; align-items: center; }\n\n    input[type=\"text\"], input[type=\"password\"] {\n      width: 100%;\n      background: var(--input-bg);\n      border: 1px solid var(--input-border);\n      border-radius: 0.75rem;\n      padding: 0.75rem 1rem;\n      font-size: 0.95rem;\n      color: var(--text);\n      font-family: inherit;\n      transition: all 0.2s ease;\n      outline: none;\n    }\n\n    input[type=\"text\"]:focus, input[type=\"password\"]:focus {\n      border-color: var(--input-focus);\n      box-shadow: 0 0 0 3px rgba(82, 181, 75, 0.15);\n    }\n\n    .toggle-pwd {\n      position: absolute;\n      right: 0.85rem;\n      background: none;\n      border: none;\n      color: var(--text-muted);\n      cursor: pointer;\n      font-size: 0.85rem;\n      padding: 0.25rem;\n      display: flex;\n      align-items: center;\n      transition: color 0.2s;\n    }\n\n    .toggle-pwd:hover { color: var(--text); }\n\n    .collapsible-trigger {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      width: 100%;\n      background: none;\n      border: none;\n      color: var(--text-muted);\n      font-size: 0.85rem;\n      font-weight: 600;\n      padding: 0.5rem 0;\n      cursor: pointer;\n      margin-top: 0.5rem;\n      transition: color 0.2s;\n    }\n\n    .collapsible-trigger:hover { color: var(--text); }\n\n    .collapsible-content {\n      display: none;\n      padding-top: 1rem;\n      border-top: 1px solid var(--card-border);\n      margin-top: 0.5rem;\n    }\n\n    .collapsible-content.open { display: block; }\n\n    .checkbox-group {\n      display: flex;\n      align-items: center;\n      gap: 0.65rem;\n      cursor: pointer;\n      font-size: 0.875rem;\n      color: #cbd5e1;\n      user-select: none;\n    }\n\n    .checkbox-group input {\n      accent-color: var(--accent-emby);\n      width: 1.1rem;\n      height: 1.1rem;\n      cursor: pointer;\n    }\n\n    .btn-row {\n      display: grid;\n      grid-template-columns: 1fr 1.3fr;\n      gap: 0.75rem;\n      margin-top: 1.5rem;\n    }\n\n    button.btn {\n      display: inline-flex;\n      align-items: center;\n      justify-content: center;\n      gap: 0.5rem;\n      padding: 0.85rem 1.25rem;\n      border-radius: 0.75rem;\n      font-size: 0.95rem;\n      font-weight: 600;\n      cursor: pointer;\n      transition: all 0.2s ease;\n      border: none;\n      font-family: inherit;\n    }\n\n    .btn-secondary {\n      background: rgba(255, 255, 255, 0.08);\n      color: var(--text);\n      border: 1px solid var(--card-border) !important;\n    }\n\n    .btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }\n\n    .btn-primary {\n      background: var(--accent-gradient);\n      color: #ffffff;\n      box-shadow: 0 4px 20px rgba(82, 181, 75, 0.25);\n    }\n\n    .btn-primary:hover {\n      opacity: 0.95;\n      transform: translateY(-1px);\n      box-shadow: 0 6px 24px rgba(82, 181, 75, 0.35);\n    }\n\n    .status-box {\n      display: none;\n      margin-top: 1rem;\n      padding: 0.75rem 1rem;\n      border-radius: 0.75rem;\n      font-size: 0.875rem;\n      align-items: center;\n      gap: 0.6rem;\n    }\n\n    .status-box.show { display: flex; }\n\n    .status-box.success {\n      background: rgba(16, 185, 129, 0.15);\n      border: 1px solid rgba(16, 185, 129, 0.3);\n      color: #34d399;\n    }\n\n    .status-box.error {\n      background: rgba(239, 68, 68, 0.15);\n      border: 1px solid rgba(239, 68, 68, 0.3);\n      color: #f87171;\n    }\n\n    .status-box.info {\n      background: rgba(99, 102, 241, 0.15);\n      border: 1px solid rgba(99, 102, 241, 0.3);\n      color: #818cf8;\n    }\n\n    .result-card { display: none; animation: fadeIn 0.3s ease; }\n    .result-card.show { display: block; }\n\n    @keyframes fadeIn {\n      from { opacity: 0; transform: translateY(8px); }\n      to { opacity: 1; transform: translateY(0); }\n    }\n\n    .url-box {\n      display: flex;\n      align-items: center;\n      background: var(--input-bg);\n      border: 1px solid var(--input-border);\n      border-radius: 0.75rem;\n      padding: 0.35rem 0.35rem 0.35rem 0.85rem;\n      margin: 1rem 0;\n    }\n\n    .url-text {\n      flex: 1;\n      font-family: 'JetBrains Mono', monospace;\n      font-size: 0.825rem;\n      color: #38bdf8;\n      overflow: hidden;\n      text-overflow: ellipsis;\n      white-space: nowrap;\n      padding-right: 0.5rem;\n    }\n\n    .copy-btn {\n      background: rgba(255, 255, 255, 0.08);\n      border: 1px solid var(--card-border);\n      color: var(--text);\n      padding: 0.5rem 0.85rem;\n      border-radius: 0.5rem;\n      font-size: 0.8rem;\n      font-weight: 600;\n      cursor: pointer;\n      display: flex;\n      align-items: center;\n      gap: 0.35rem;\n      transition: all 0.2s;\n    }\n\n    .copy-btn:hover { background: rgba(255, 255, 255, 0.15); }\n\n    .qr-section {\n      display: flex;\n      flex-direction: column;\n      align-items: center;\n      justify-content: center;\n      padding: 1.25rem;\n      background: rgba(0, 0, 0, 0.25);\n      border-radius: 0.85rem;\n      margin: 1.25rem 0;\n    }\n\n    #qrcode {\n      background: white;\n      padding: 10px;\n      border-radius: 8px;\n      display: flex;\n      justify-content: center;\n      align-items: center;\n    }\n\n    #qrcode img { display: block; }\n\n    .steps-list {\n      margin-top: 1.25rem;\n      padding-left: 1.2rem;\n      color: #cbd5e1;\n      font-size: 0.875rem;\n    }\n\n    .steps-list li { margin-bottom: 0.65rem; }\n    .steps-list li strong { color: #ffffff; }\n\n    .footer {\n      text-align: center;\n      color: var(--text-muted);\n      font-size: 0.8rem;\n      margin-top: 1rem;\n    }\n\n    .footer a { color: #cbd5e1; text-decoration: none; }\n    .footer a:hover { text-decoration: underline; }\n\n    .spinner {\n      width: 14px;\n      height: 14px;\n      border: 2px solid rgba(255,255,255,0.3);\n      border-top-color: white;\n      border-radius: 50%;\n      animation: spin 0.8s linear infinite;\n      display: inline-block;\n    }\n\n    @keyframes spin { to { transform: rotate(360deg); } }\n  </style>\n</head>\n<body>\n\n  <div class=\"container\">\n    <div class=\"header\">\n      <div class=\"badge-row\">\n        <div class=\"badge\">\n          <span class=\"badge-dot\"></span>\n          Emby & Jellyfin v3.6.0\n        </div>\n        <div class=\"badge\">\n          Dinamik Kataloglar & Koleksiyonlar\n        </div>\n        <div class=\"badge\">\n          Direct Play\n        </div>\n      </div>\n      <h1>Nuvio Emby & Jellyfin Yapılandırıcı</h1>\n      <p class=\"subtitle\">Emby veya Jellyfin sunucunuzu bağlayın; Nuvio için kütüphane katalogları, tür/yıl filtreleri ve Direct Play destekli kişisel manifestinizi üretin.</p>\n    </div>\n\n    <!-- Yapılandırma Formu -->\n    <div class=\"card\">\n      <form id=\"configForm\" onsubmit=\"return false;\">\n        <div class=\"form-group\">\n          <label for=\"serverUrl\">\n            Emby / Jellyfin Sunucu Adresi\n            <span class=\"label-hint\">Örn: http://192.168.1.100:8096 veya https://jellyfin.alanadi.com</span>\n          </label>\n          <div class=\"input-wrapper\">\n            <input type=\"text\" id=\"serverUrl\" placeholder=\"http://192.168.1.100:8096 veya https://jellyfin.alanadi.com\" required autocomplete=\"off\">\n          </div>\n        </div>\n\n        <div class=\"form-group\">\n          <label for=\"username\">\n            Kullanıcı Adı\n            <span class=\"label-hint\">Emby veya Jellyfin kullanıcı adınız</span>\n          </label>\n          <div class=\"input-wrapper\">\n            <input type=\"text\" id=\"username\" placeholder=\"Örn: Oguz\" required autocomplete=\"username\">\n          </div>\n        </div>\n\n        <div class=\"form-group\">\n          <label for=\"password\">\n            Şifre\n            <span class=\"label-hint\">Şifresiz ise boş bırakın</span>\n          </label>\n          <div class=\"input-wrapper\">\n            <input type=\"password\" id=\"password\" placeholder=\"••••••••\" autocomplete=\"current-password\">\n            <button type=\"button\" class=\"toggle-pwd\" id=\"togglePwd\" title=\"Şifreyi Göster/Gizle\">👁</button>\n          </div>\n        </div>\n\n        <!-- Gelişmiş Ayarlar (Akordiyon) -->\n        <button type=\"button\" class=\"collapsible-trigger\" id=\"advTrigger\">\n          <span>⚙️ Gelişmiş Seçenekler</span>\n          <span id=\"advArrow\">▼</span>\n        </button>\n\n        <div class=\"collapsible-content\" id=\"advContent\">\n          <div class=\"form-group\">\n            <label class=\"checkbox-group\">\n              <input type=\"checkbox\" id=\"debugMode\">\n              <span>Hata Ayıklama (Debug) Modu - Konsola ayrıntılı akış çözümleme logları bas</span>\n            </label>\n          </div>\n\n          <div class=\"form-group\">\n            <label for=\"logEndpoint\">\n              Uzak Telemetri / ntfy.sh Log Uç Noktası\n              <span class=\"label-hint\">Opsiyonel</span>\n            </label>\n            <div class=\"input-wrapper\">\n              <input type=\"text\" id=\"logEndpoint\" placeholder=\"https://ntfy.sh/benim-emby-loglarim\">\n            </div>\n          </div>\n        </div>\n\n        <div class=\"btn-row\">\n          <button type=\"button\" class=\"btn btn-secondary\" id=\"btnTest\">\n            <span id=\"testIcon\">🔍</span>\n            <span id=\"testText\">Bağlantıyı Test Et</span>\n          </button>\n          <button type=\"button\" class=\"btn btn-primary\" id=\"btnGenerate\">\n            <span>⚡ Manifest URL'si Üret</span>\n          </button>\n        </div>\n\n        <div class=\"status-box\" id=\"statusBox\"></div>\n      </form>\n    </div>\n\n    <!-- Sonuç Bölümü -->\n    <div class=\"card result-card\" id=\"resultCard\">\n      <h3 style=\"font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; color: #10b981;\">🎉 Manifest URL'niz Hazır!</h3>\n      <p style=\"font-size: 0.85rem; color: var(--text-muted);\">Aşağıdaki bağlantı Emby sunucunuz ve kimlik bilgilerinizle yapılandırılmış kişisel manifest adresinizdir.</p>\n\n      <div class=\"url-box\">\n        <span class=\"url-text\" id=\"manifestUrlText\"></span>\n        <button type=\"button\" class=\"copy-btn\" id=\"btnCopy\">\n          <span id=\"copyIcon\">📋</span>\n          <span id=\"copyText\">Kopyala</span>\n        </button>\n      </div>\n\n            <!-- Nuvio Koleksiyon Yapısı (Benim Medyam) -->\n      <div style=\"background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 1rem; margin-top: 1rem; margin-bottom: 1rem;\">\n        <div style=\"display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;\">\n          <h4 style=\"font-size: 0.95rem; font-weight: 700; color: #34d399; margin: 0;\">📁 Nuvio Koleksiyon Yapısı (\"Benim Medyam\")</h4>\n          <span style=\"font-size: 0.7rem; background: #065f46; color: #a7f3d0; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;\">collections.json</span>\n        </div>\n        <p style=\"font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;\">\n          Nuvio ana ekranında Emby'deki gibi <strong>\"Benim Medyam\"</strong> klasör görünümünü (Diziler, Filmler, Koleksiyonlar yan yana yatay kutucuklar halinde) elde etmek için bu dosyayı Nuvio hesabınıza aktarabilirsiniz.\n        </p>\n\n        <div style=\"display: flex; gap: 0.5rem; flex-wrap: wrap;\">\n          <a id=\"btnDownloadCollection\" href=\"#\" download=\"collections.json\" class=\"btn\" style=\"background: #059669; color: #fff; text-decoration: none; padding: 0.5rem 0.85rem; font-size: 0.8rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600;\">\n            <span>📥</span> <span>collections.json İndir</span>\n          </a>\n          <button type=\"button\" id=\"btnCopyCollectionJson\" class=\"btn\" style=\"background: rgba(255,255,255,0.08); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.15); padding: 0.5rem 0.85rem; font-size: 0.8rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer;\">\n            <span id=\"copyCollectionIcon\">📋</span> <span id=\"copyCollectionText\">JSON Kopyala</span>\n          </button>\n        </div>\n\n        <div style=\"margin-top: 0.75rem; font-size: 0.75rem; color: #94a3b8; line-height: 1.4;\">\n          <strong>Nasıl Yüklenir:</strong> <a href=\"https://nuvio.tv\" target=\"_blank\" style=\"color: #60a5fa; text-decoration: underline;\">nuvio.tv</a> adresinde hesabınıza giriş yapın → <strong>Account &gt; Collections &gt; Import</strong> kısmından bu <code>collections.json</code> dosyasını seçip onaylayın.\n        </div>\n      </div>\n\n      <div class=\"qr-section\">\n        <div id=\"qrcode\"></div>\n        <span style=\"font-size: 0.75rem; color: var(--text-muted); margin-top: 0.65rem;\">Android TV veya telefon kamerasından kolayca taratabilirsiniz</span>\n      </div>\n\n      <h4 style=\"font-size: 0.95rem; font-weight: 700; margin-top: 1rem; color: #f1f5f9;\">📲 Nuvio'ya Nasıl Eklenir? (Önemli: Addon Olarak Ekleyin)</h4>\n      <div style=\"background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.85rem; font-size: 0.8rem; color: #93c5fd;\">\n        💡 <strong>Dikkat:</strong> Katalogların ve koleksiyonların Nuvio'da görünebilmesi için bu bağlantıyı <em>Plugin/Scraper</em> olarak değil, <strong>Stremio Addon</strong> olarak eklemeniz gerekmektedir.\n      </div>\n      <ol class=\"steps-list\">\n        <li>Yukarıdaki URL'yi kopyalayın.</li>\n        <li>Nuvio uygulamasını açın ve <strong>Ayarlar (Settings) > Eklentiler (Addons) > Eklenti Ekle (Add Addon)</strong> bölümüne gidin.</li>\n        <li>Kopyaladığınız manifest URL'sini yapıştırın ve <strong>Ekle</strong> butonuna basın.</li>\n        <li><strong>📚 Otomatik Eklenen Kataloglar:</strong> Nuvio Ana Sayfasında ve Keşfet sekmesinde tüm Emby bölümleriniz listelenir:\n          <ul style=\"margin-top: 0.35rem; padding-left: 1.2rem; font-size: 0.8rem; color: var(--text-muted);\">\n            <li><strong>İzlemeye Devam Et:</strong> Yarım bıraktığınız filmler ve bölümler en üst satırda.</li>\n            <li><strong>Son Eklenenler:</strong> Emby sunucunuza yeni eklenen filmler ve diziler.</li>\n            <li><strong>Tümü (A - Z):</strong> 19 farklı Tür (Aksiyon, Komedi, Korku...) ve Yıl filtreleriyle taranabilir arşiv.</li>\n            <li><strong>Koleksiyonlar (BoxSet):</strong> Film serileri (Adalet, Baba, Harry Potter...) tek başlık altında.</li>\n          </ul>\n        </li>\n        <li><strong>🚀 Direct Play:</strong> İstediğiniz içeriğe tıklayın; Emby sunucunuzdan 0ms gecikmeyle, orijinal kalitesinde ve altyazılarıyla anında oynatın!</li>\n      </ol>\n    </div>\n\n    <div class=\"footer\">\n      <p>🔒 <strong>Sıfır Günlük & Güvenlik Garantisi:</strong> Kimlik bilgileriniz hiçbir sunucuda depolanmaz. Yapılandırma istemci tarafında URL-safe Base64 olarak kodlanır.</p>\n    </div>\n  </div>\n\n  <script>\n    // Şifre Göster/Gizle\n    const togglePwd = document.getElementById('togglePwd');\n    const pwdInput = document.getElementById('password');\n    togglePwd.addEventListener('click', () => {\n      if (pwdInput.type === 'password') {\n        pwdInput.type = 'text';\n        togglePwd.textContent = '🔒';\n      } else {\n        pwdInput.type = 'password';\n        togglePwd.textContent = '👁';\n      }\n    });\n\n    // Gelişmiş Ayarlar Aç/Kapa\n    const advTrigger = document.getElementById('advTrigger');\n    const advContent = document.getElementById('advContent');\n    const advArrow = document.getElementById('advArrow');\n    advTrigger.addEventListener('click', () => {\n      advContent.classList.toggle('open');\n      advArrow.textContent = advContent.classList.contains('open') ? '▲' : '▼';\n    });\n\n    // Durum Bildirimi Göster\n    const statusBox = document.getElementById('statusBox');\n    function showStatus(type, msg) {\n      statusBox.className = 'status-box show ' + type;\n      statusBox.innerHTML = msg;\n    }\n\n    // URL-safe Base64 Kodlama\n    function encodeBase64Url(str) {\n      const bytes = new TextEncoder().encode(str);\n      let binary = '';\n      for (let i = 0; i < bytes.length; i++) {\n        binary += String.fromCharCode(bytes[i]);\n      }\n      return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');\n    }\n\n    // Form Değerlerini Topla\n    function getFormData() {\n      let serverUrl = document.getElementById('serverUrl').value.trim();\n      const username = document.getElementById('username').value.trim();\n      const password = document.getElementById('password').value;\n      const debugMode = document.getElementById('debugMode').checked;\n      const logEndpoint = document.getElementById('logEndpoint').value.trim();\n\n      if (!serverUrl) {\n        showStatus('error', '⚠️ Lütfen Emby sunucu adresinizi girin.');\n        return null;\n      }\n\n      if (!username) {\n        showStatus('error', '⚠️ Lütfen Emby kullanıcı adınızı girin.');\n        return null;\n      }\n\n      serverUrl = serverUrl.replace(/\\/+$/, '');\n      if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {\n        serverUrl = 'http://' + serverUrl;\n      }\n\n      return {\n        serverUrl,\n        username,\n        password,\n        debugMode,\n        logEndpoint\n      };\n    }\n\n    // Bağlantıyı Test Et\n    const btnTest = document.getElementById('btnTest');\n    const testIcon = document.getElementById('testIcon');\n    const testText = document.getElementById('testText');\n\n    btnTest.addEventListener('click', async () => {\n      const data = getFormData();\n      if (!data) return;\n\n      testIcon.innerHTML = '<span class=\"spinner\"></span>';\n      testText.textContent = 'Test Ediliyor...';\n      btnTest.disabled = true;\n      showStatus('info', 'Emby / Jellyfin sunucusu ile bağlantı kuruluyor...');\n\n      try {\n        const resp = await fetch('/api/test-connection', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify(data)\n        });\n\n        const res = await resp.json();\n        if (res.ok) {\n          const typeLabel = res.serverType === 'jellyfin' ? 'Jellyfin' : 'Emby';\n          let libHtml = '';\n          if (res.libraries && res.libraries.length > 0) {\n            const pills = res.libraries.map(lib => {\n              let icon = '🎬';\n              if (lib.type === 'tvshows') icon = '📺';\n              else if (lib.type === 'boxsets') icon = '📦';\n              else if (lib.type === 'playlists') icon = '📑';\n              return '<span style=\"display:inline-block; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:999px; padding:0.2rem 0.6rem; font-size:0.75rem; margin:2px;\">' + icon + ' ' + lib.name + '</span>';\n            }).join(' ');\n            libHtml = '<div style=\"margin-top:8px;\"><strong>📚 Tespit Edilen Kütüphaneler:</strong><div style=\"display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;\">' + pills + '</div></div>';\n          }\n          showStatus('success', '✅ <strong>Bağlantı Başarılı!</strong> Sunucu: ' + (res.serverName || typeLabel) + ' (' + (res.productName || typeLabel) + ' v' + (res.version || 'Bilinmiyor') + '), Kullanıcı: ' + (res.userName || data.username) + libHtml);\n        } else {\n          showStatus('error', '❌ <strong>Bağlantı Başarısız:</strong> ' + (res.error || 'Sunucuya erişilemedi.'));\n        }\n      } catch (err) {\n        showStatus('error', '❌ <strong>Ağ Hatası:</strong> ' + err.message);\n      } finally {\n        testIcon.textContent = '🔍';\n        testText.textContent = 'Bağlantıyı Test Et';\n        btnTest.disabled = false;\n      }\n    });\n\n    // Manifest URL'si Üret\n    const btnGenerate = document.getElementById('btnGenerate');\n    const resultCard = document.getElementById('resultCard');\n    const manifestUrlText = document.getElementById('manifestUrlText');\n    const qrcodeContainer = document.getElementById('qrcode');\n    let qrInstance = null;\n\n    btnGenerate.addEventListener('click', () => {\n      const data = getFormData();\n      if (!data) return;\n\n      const token = encodeBase64Url(JSON.stringify(data));\n      const origin = window.location.origin;\n      const manifestUrl = origin + '/' + token + '/manifest.json';\n\n      manifestUrlText.textContent = manifestUrl;\n      const collectionUrl = manifestUrl.replace(\"/manifest.json\", \"/collections.json\");\n      const btnDownloadCol = document.getElementById(\"btnDownloadCollection\");\n      if (btnDownloadCol) btnDownloadCol.href = collectionUrl;\n\n      const btnCopyCol = document.getElementById(\"btnCopyCollectionJson\");\n      if (btnCopyCol) {\n        btnCopyCol.onclick = async () => {\n          try {\n            const cRes = await fetch(collectionUrl);\n            const cJson = await cRes.text();\n            await navigator.clipboard.writeText(cJson);\n            const copyIcon = document.getElementById(\"copyCollectionIcon\");\n            const copyText = document.getElementById(\"copyCollectionText\");\n            copyIcon.textContent = \"✅\";\n            copyText.textContent = \"Kopyalandı!\";\n            setTimeout(() => {\n              copyIcon.textContent = \"📋\";\n              copyText.textContent = \"JSON Kopyala\";\n            }, 2500);\n          } catch (e) {\n            alert(\"Koleksiyon JSON kopyalanamadı.\");\n          }\n        };\n      }\n      resultCard.classList.add('show');\n      showStatus('success', '✅ Kişisel Manifest URL\\'si başarıyla üretildi! Aşağıdan kopyalayabilirsiniz.');\n\n      // QR Kod Üret\n      qrcodeContainer.innerHTML = '';\n      if (typeof QRCode !== 'undefined') {\n        qrInstance = new QRCode(qrcodeContainer, {\n          text: manifestUrl,\n          width: 140,\n          height: 140,\n          colorDark: '#0f172a',\n          colorLight: '#ffffff',\n          correctLevel: QRCode.CorrectLevel.M\n        });\n      }\n\n      resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });\n    });\n\n    // Kopyala Butonu\n    const btnCopy = document.getElementById('btnCopy');\n    const copyText = document.getElementById('copyText');\n    const copyIcon = document.getElementById('copyIcon');\n\n    btnCopy.addEventListener('click', () => {\n      const url = manifestUrlText.textContent;\n      if (!url) return;\n\n      navigator.clipboard.writeText(url).then(() => {\n        copyText.textContent = 'Kopyalandı!';\n        copyIcon.textContent = '✓';\n        setTimeout(() => {\n          copyText.textContent = 'Kopyala';\n          copyIcon.textContent = '📋';\n        }, 2000);\n      }).catch(() => {\n        copyText.textContent = 'Ctrl+C ile Kopyala';\n      });\n    });\n  </script>\n</body>\n</html>";

function decodeBase64Url(str) {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (e) {
    try {
      return JSON.parse(atob(str));
    } catch (err) {
      return null;
    }
  }
}

function generateCustomEmbyCode(baseCode, config) {
  const configReplacement = `const CONFIG = {
  serverUrl: ${JSON.stringify(config.serverUrl || "")},
  username: ${JSON.stringify(config.username || "")},
  password: ${JSON.stringify(config.password || "")},
  debugMode: ${Boolean(config.debugMode)},
  apiKey: ${JSON.stringify(config.apiKey || "")},
  userId: ${JSON.stringify(config.userId || "")}
};
const LOG_ENDPOINT = ${JSON.stringify(config.logEndpoint || "")};`;

  return baseCode.replace(/const CONFIG = \{[\s\S]*?\};\s*const LOG_ENDPOINT = .*?;/, configReplacement);
}

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Emby-Authorization',
    ...extra
  };
}

// ==========================================
// MEDIA INFO FORMATTING & STREAM HELPERS
// ==========================================

function getQualityTag(videoStream) {
  if (!videoStream) return "Unknown";
  const height = Number(videoStream.Height) || 0;
  const width = Number(videoStream.Width) || 0;
  const displayTitle = videoStream.DisplayTitle || "";

  const match = displayTitle.match(/\b(\d+k|4k|2160p|1440p|1080p|720p|576p|480p|sd)\b/i);
  if (match) {
    const res = match[1].toUpperCase();
    if (res.includes("4K") || res.includes("2160")) return "4K";
    if (res.includes("1440")) return "1440p";
    if (res.includes("1080")) return "1080p";
    if (res.includes("720")) return "720p";
    if (res.includes("576")) return "576p";
    if (res.includes("480")) return "480p";
  }

  if (width >= 3840 || height >= 2160) return "4K";
  if (height >= 1440) return "1440p";
  if (height >= 1080) return "1080p";
  if (height >= 720) return "720p";
  if (height >= 576) return "576p";
  if (height >= 480) return "480p";
  return "SD";
}

function getResolutionDimensions(videoStream) {
  if (!videoStream || !videoStream.Width || !videoStream.Height) return null;
  return `${videoStream.Width}x${videoStream.Height}`;
}

function getVideoTag(videoStream) {
  if (!videoStream) return "";
  const codec = (videoStream.Codec || "").toUpperCase();
  const profile = videoStream.Profile || "";
  const codecMap = {
    "H264": "H.264", "AVC": "H.264", "H265": "HEVC", "HEVC": "HEVC",
    "VP8": "VP8", "VP9": "VP9", "AV1": "AV1", "MPEG2VIDEO": "MPEG-2", "VC1": "VC-1"
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
  return null;
}

function getAudioTag(audioStream) {
  if (!audioStream) return "";
  const codec = (audioStream.Codec || "").toUpperCase();
  const channels = audioStream.Channels;
  const title = (audioStream.DisplayTitle || "").toUpperCase();

  const codecMap = {
    "AAC": "AAC", "AC3": "DD", "EAC3": "DD+", "DTS": "DTS", "DTSHD": "DTS-HD",
    "TRUEHD": "TrueHD", "FLAC": "FLAC", "OPUS": "Opus", "MP3": "MP3"
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
  const mbps = (Number(bps) / 1000000).toFixed(1);
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

function buildStreamDescription(mediaInfo) {
  const lines = [];

  // Satır 1: Çözünürlük • Boyutlar (Örn: 1080p • 1920x1080)
  const resLine = [];
  if (mediaInfo.qualityTag && mediaInfo.qualityTag !== "Unknown") resLine.push(mediaInfo.qualityTag);
  if (mediaInfo.resolutionDimensions) resLine.push(mediaInfo.resolutionDimensions);
  if (resLine.length > 0) lines.push(resLine.join(" • "));

  // Satır 2: HDR/DV • Video Codec (Örn: HEVC 10bit)
  const typeLine = [];
  if (mediaInfo.hdrTag) typeLine.push(mediaInfo.hdrTag);
  if (mediaInfo.videoTag) typeLine.push(mediaInfo.videoTag);
  if (typeLine.length > 0) lines.push(typeLine.join(" • "));

  // Satır 3: REMUX (varsa)
  if (mediaInfo.isRemux) lines.push("REMUX");

  // Satır 4: Ses Formatı (Örn: DD+ 2.0)
  if (mediaInfo.audioTag) lines.push(mediaInfo.audioTag);

  // Satır 5: Kapsayıcı • Bitrate • Boyut (Örn: MKV • 3.0Mbps • 412MB)
  const fileLine = [];
  if (mediaInfo.container) fileLine.push(mediaInfo.container);
  if (mediaInfo.bitrateFormatted) fileLine.push(mediaInfo.bitrateFormatted);
  if (mediaInfo.sizeFormatted) fileLine.push(mediaInfo.sizeFormatted);
  if (fileLine.length > 0) lines.push(fileLine.join(" • "));

  return lines.join("\n") || "Direct Play";
}

function parseInputId(id, type) {
  let cleanId = String(id || "").trim();
  let targetSeason = null;
  let targetEpisode = null;

  if (cleanId.includes(":")) {
    const parts = cleanId.split(":");
    cleanId = parts[0];
    if (parts[1]) targetSeason = parseInt(parts[1], 10) || null;
    if (parts[2]) targetEpisode = parseInt(parts[2], 10) || null;
  }

  if (cleanId.toLowerCase().startsWith("tmdb:")) {
    cleanId = cleanId.substring(5).trim();
  }

  const isImdb = cleanId.startsWith("tt");
  const mediaType = (type === "series" || type === "tv" || targetSeason !== null) ? "tv" : "movie";

  return { cleanId, isImdb, mediaType, targetSeason, targetEpisode };
}

// Emby & Jellyfin API & Stream Resolver
async function resolveEmbyStreams(userConfig, type, rawId) {
  let serverUrl = (userConfig.serverUrl || "").trim().replace(/\/+$/, '');
  const username = (userConfig.username || "").trim();
  const password = userConfig.password || "";
  let apiKey = userConfig.apiKey || "";
  let userId = userConfig.userId || "";

  if (!serverUrl) return [];
  if (!serverUrl.startsWith("http://") && !serverUrl.startsWith("https://")) {
    serverUrl = "http://" + serverUrl;
  }

  // Detect server info (Jellyfin vs Emby)
  let effectivePrefix = '';
  let serverType = 'emby';

  for (const prefix of ['', '/emby']) {
    try {
      const r = await fetch(`${serverUrl}${prefix}/System/Info/Public`, {
        headers: { 'Accept': 'application/json' }
      });
      if (r.ok) {
        const info = await r.json();
        effectivePrefix = prefix;
        const prod = ((info && (info.ProductName || info.ServerName)) || '').toLowerCase();
        if (prod.includes('jellyfin')) {
          serverType = 'jellyfin';
          effectivePrefix = '';
        }
        break;
      }
    } catch (e) {}
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'X-Emby-Authorization': 'MediaBrowser Client="Nuvio Stream Resolver", Device="Serverless", DeviceId="nuvio-stream", Version="3.5.0"',
    'Authorization': 'MediaBrowser Client="Nuvio Stream Resolver", Device="Serverless", DeviceId="nuvio-stream", Version="3.5.0"'
  };

  // 1. Authenticate if username provided
  if (username) {
    const authEndpoints = [`${serverUrl}${effectivePrefix}/Users/AuthenticateByName`];
    if (effectivePrefix !== '') authEndpoints.push(`${serverUrl}/Users/AuthenticateByName`);
    else authEndpoints.push(`${serverUrl}/emby/Users/AuthenticateByName`);

    for (const aUrl of authEndpoints) {
      try {
        const authRes = await fetch(aUrl, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ Username: username, Pw: password })
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          apiKey = authData.AccessToken || apiKey;
          userId = (authData.User && authData.User.Id) || userId;
          break;
        }
      } catch (e) {}
    }
  }

  if (!apiKey) return [];

  // BoxSet Stream Resolver: returns playable streams for all films in this collection
  if (rawId.startsWith("emby:boxset:")) {
    const boxsetId = rawId.replace("emby:boxset:", "");
    try {
      const cRes = await fetch(`${serverUrl}${effectivePrefix}/Users/${userId}/Items?ParentId=${encodeURIComponent(boxsetId)}&Fields=Name,ProductionYear,MediaSources&SortBy=SortName&SortOrder=Ascending&api_key=${encodeURIComponent(apiKey)}`, { headers: authHeaders });
      if (cRes.ok) {
        const cData = await cRes.json();
        const children = cData.Items || [];
        const allStreams = [];
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          const childStreams = await resolveEmbyStreams(userConfig, "movie", `emby:item:${child.Id}`);
          for (const s of childStreams) {
            allStreams.push({
              name: s.name || "Emby",
              title: `🎬 ${i + 1}. Film: ${child.Name}${child.ProductionYear ? ` (${child.ProductionYear})` : ""}\n${s.title || ""}`,
              url: s.url
            });
          }
        }
        if (allStreams.length > 0) return allStreams;
      }
    } catch (e) {}
  }

  // Direct Emby ID support (from catalogs and collections)
  let directTargetId = null;
  if (/^emby:(item:)?([a-zA-Z0-9_-]+)/i.test(rawId)) {
    const match = rawId.match(/^emby:(item:)?([a-zA-Z0-9_-]+)/i);
    directTargetId = match[2];
  }

  let targetItemId = directTargetId;

  const apiHeaders = {
    'Accept': 'application/json',
    'X-Emby-Token': apiKey,
    'X-MediaBrowser-Token': apiKey,
    'Authorization': `MediaBrowser Token="${apiKey}"`
  };

  if (!targetItemId) {
    const idInfo = parseInputId(rawId, type);
    const isSeries = idInfo.mediaType === "tv";
    const itemType = isSeries ? "Series" : "Movie";

    // 2. Search item by ProviderId
    let matchedItem = null;
    const providerFormats = idInfo.isImdb
      ? [`imdb.${idInfo.cleanId}`, `Imdb.${idInfo.cleanId}`]
      : [`tmdb.${idInfo.cleanId}`, `Tmdb.${idInfo.cleanId}`];

    for (const prefix of [effectivePrefix, effectivePrefix === '' ? '/emby' : '']) {
      if (matchedItem) break;
      for (const pId of providerFormats) {
        const url = `${serverUrl}${prefix}/Users/${userId}/Items?AnyProviderIdEquals=${encodeURIComponent(pId)}&IncludeItemTypes=${itemType}&Recursive=true&Fields=ProviderIds,Name,Id,MediaSources&api_key=${encodeURIComponent(apiKey)}`;
        try {
          const r = await fetch(url, { headers: apiHeaders });
          if (r.ok) {
            const d = await r.json();
            if (d && Array.isArray(d.Items) && d.Items.length > 0) {
              matchedItem = d.Items[0];
              break;
            }
          }
        } catch (e) {}
      }
    }

    // Fallback: search /Items
    if (!matchedItem) {
      for (const pId of providerFormats) {
        const url = `${serverUrl}/Items?AnyProviderIdEquals=${encodeURIComponent(pId)}&IncludeItemTypes=${itemType}&Recursive=true&Fields=ProviderIds,Name,Id,MediaSources&api_key=${encodeURIComponent(apiKey)}`;
        try {
          const r = await fetch(url, { headers: apiHeaders });
          if (r.ok) {
            const d = await r.json();
            if (d && Array.isArray(d.Items) && d.Items.length > 0) {
              matchedItem = d.Items[0];
              break;
            }
          }
        } catch (e) {}
      }
    }

    if (!matchedItem) return [];

    // 3. If Series, find target episode
    targetItemId = matchedItem.Id;
    if (isSeries && idInfo.targetSeason && idInfo.targetEpisode) {
      try {
        const seasonsUrl = `${serverUrl}${effectivePrefix}/Shows/${matchedItem.Id}/Seasons?UserId=${encodeURIComponent(userId)}&api_key=${encodeURIComponent(apiKey)}`;
        const sRes = await fetch(seasonsUrl, { headers: apiHeaders });
        if (sRes.ok) {
          const sData = await sRes.json();
          const season = (sData.Items || []).find(s => s.IndexNumber === idInfo.targetSeason);
          if (season) {
            const epUrl = `${serverUrl}${effectivePrefix}/Shows/${matchedItem.Id}/Episodes?SeasonId=${encodeURIComponent(season.Id)}&UserId=${encodeURIComponent(userId)}&Fields=MediaSources,Name,Id,IndexNumber,ParentIndexNumber&api_key=${encodeURIComponent(apiKey)}`;
            const epRes = await fetch(epUrl, { headers: apiHeaders });
            if (epRes.ok) {
              const epData = await epRes.json();
              const episode = (epData.Items || []).find(ep => ep.IndexNumber === idInfo.targetEpisode && ep.ParentIndexNumber === idInfo.targetSeason);
              if (episode) targetItemId = episode.Id;
            }
          }
        }
      } catch (e) {}
    }
  }

  // 4. Get PlaybackInfo
  let sources = [];
  try {
    const pbRes = await fetch(`${serverUrl}${effectivePrefix}/Items/${targetItemId}/PlaybackInfo?api_key=${encodeURIComponent(apiKey)}&UserId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, apiHeaders),
      body: JSON.stringify({ UserId: userId, StartTimeTicks: 0, IsPlayback: false })
    });
    if (pbRes.ok) {
      const pbData = await pbRes.json();
      if (pbData && Array.isArray(pbData.MediaSources)) sources = pbData.MediaSources;
    }
  } catch (e) {}

  if (sources.length === 0) return [];

  // 5. Sort sources: Quality first (4K > 1440p > 1080p > 720p), then Size descending
  const resOrder = { "4K": 1, "1440p": 2, "1080p": 3, "720p": 4, "576p": 5, "480p": 6, "SD": 7, "Unknown": 8 };
  sources.sort((a, b) => {
    const vA = (a.MediaStreams || []).find(s => s.Type === "Video");
    const vB = (b.MediaStreams || []).find(s => s.Type === "Video");
    const qA = getQualityTag(vA);
    const qB = getQualityTag(vB);
    const rA = resOrder[qA] !== undefined ? resOrder[qA] : 10;
    const rB = resOrder[qB] !== undefined ? resOrder[qB] : 10;
    if (rA !== rB) return rA - rB;

    const sizeA = Number(a.Size) || Number(a.Bitrate) || 0;
    const sizeB = Number(b.Size) || Number(b.Bitrate) || 0;
    return sizeB - sizeA;
  });

  // 6. Map to Stremio Addon Streams
  const streamProviderName = serverType === 'jellyfin' ? 'Jellyfin' : 'Emby';

  return sources.map(source => {
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
    const streamUrl = `${serverUrl}${effectivePrefix}/Videos/${targetItemId}/stream.${container.toLowerCase()}?static=true&MediaSourceId=${encodeURIComponent(source.Id)}&api_key=${encodeURIComponent(apiKey)}`;

    // Extract subtitles
    const subtitles = [];
    const subStreams = mediaStreams.filter(s => s.Type === "Subtitle");
    for (const sub of subStreams) {
      const subIndex = sub.Index;
      const subUrl = `${serverUrl}${effectivePrefix}/Videos/${targetItemId}/${source.Id}/Subtitles/${subIndex}/Stream.vtt?api_key=${encodeURIComponent(apiKey)}`;
      subtitles.push({
        id: `sub-${subIndex}`,
        url: subUrl,
        lang: sub.Language || "und"
      });
    }

    return {
      name: streamProviderName,
      title: streamDescription,
      description: streamDescription,
      url: streamUrl,
      behaviorHints: {
        filename: filename,
        videoSize: Number(source.Size) || undefined,
        notWebReady: true,
        bingeGroup: `${streamProviderName}-${(qualityTag || "Direct Play").trim()}`
      },
      subtitles: subtitles
    };
  });
}

// Caches for auth and catalogs in Cloudflare Worker
const authInfoCache = new Map();
const catalogsCache = new Map();

async function getEmbyAuthAndInfo(config) {
  let serverUrl = (config.serverUrl || '').trim().replace(/\/+$/, '');
  const username = (config.username || '').trim();
  const password = config.password || '';
  let apiKey = (config.apiKey || '').trim();
  let userId = (config.userId || '').trim();

  if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
    serverUrl = 'http://' + serverUrl;
  }

  const cacheKey = `${serverUrl}:${username || apiKey}`;
  const now = Date.now();
  if (authInfoCache.has(cacheKey)) {
    const cached = authInfoCache.get(cacheKey);
    if (now - cached.timestamp < 30 * 60 * 1000) return cached;
  }

  let effectivePrefix = '';
  let serverType = config.serverType || 'emby';
  let serverName = 'Emby Server';

  for (const prefix of ['', '/emby']) {
    try {
      const r = await fetch(`${serverUrl}${prefix}/System/Info/Public`, {
        headers: { 'Accept': 'application/json' }
      });
      if (r.ok) {
        const info = await r.json();
        effectivePrefix = prefix;
        const prod = ((info && (info.ProductName || info.ServerName)) || '').toLowerCase();
        if (prod.includes('jellyfin')) {
          serverType = 'jellyfin';
          effectivePrefix = '';
        }
        serverName = info.ServerName || (serverType === 'jellyfin' ? 'Jellyfin Server' : 'Emby Server');
        break;
      }
    } catch (e) {}
  }

  if (!apiKey && username) {
    const authHeaders = {
      'Content-Type': 'application/json',
      'X-Emby-Authorization': 'MediaBrowser Client="Nuvio Worker", Device="Serverless", DeviceId="nuvio-worker", Version="3.6.0"',
      'Authorization': 'MediaBrowser Client="Nuvio Worker", Device="Serverless", DeviceId="nuvio-worker", Version="3.6.0"'
    };

    const authEndpoints = [`${serverUrl}${effectivePrefix}/Users/AuthenticateByName`];
    if (effectivePrefix !== '') authEndpoints.push(`${serverUrl}/Users/AuthenticateByName`);
    else authEndpoints.push(`${serverUrl}/emby/Users/AuthenticateByName`);

    for (const aUrl of authEndpoints) {
      try {
        const authRes = await fetch(aUrl, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ Username: username, Pw: password })
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          apiKey = authData.AccessToken || '';
          userId = (authData.User && authData.User.Id) || '';
          break;
        }
      } catch (e) {}
    }
  }

  const res = {
    serverUrl,
    prefix: effectivePrefix,
    serverType,
    serverName,
    apiKey,
    userId,
    timestamp: now
  };

  if (apiKey && userId) {
    authInfoCache.set(cacheKey, res);
  }
  return res;
}

function parseExtraArgs(extraStr, searchParams) {
  const result = {};
  if (extraStr) {
    const pairs = extraStr.split('&');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx !== -1) {
        const k = decodeURIComponent(pair.substring(0, idx)).toLowerCase();
        const v = decodeURIComponent(pair.substring(idx + 1));
        result[k] = v;
      }
    }
  }
  if (searchParams) {
    for (const [k, v] of searchParams.entries()) {
      result[k.toLowerCase()] = v;
    }
  }
  return result;
}

function formatEmbyItemToMeta(item, authInfo, defaultType) {
  const isBoxset = item.Type === "BoxSet";
  const isEpisode = item.Type === "Episode";
  const isSeries = item.Type === "Series" || (defaultType === "series" && !isEpisode);
  const isPlaylist = item.Type === "Playlist";

  let id = `emby:item:${item.Id}`;
  if (isBoxset) {
    id = `emby:boxset:${item.Id}`;
  } else if (isPlaylist) {
    id = `emby:playlist:${item.Id}`;
  }

  let name = item.Name;
  let posterId = item.Id;

  if (isEpisode) {
    const sNum = item.ParentIndexNumber !== undefined ? item.ParentIndexNumber : 1;
    const eNum = item.IndexNumber !== undefined ? item.IndexNumber : 1;
    name = (item.SeriesName ? `${item.SeriesName} - ` : "") + `S${sNum}E${eNum}: ${item.Name}`;
    if (item.SeriesId) posterId = item.SeriesId;
  }

  const poster = `${authInfo.serverUrl}${authInfo.prefix}/Items/${posterId}/Images/Primary?api_key=${encodeURIComponent(authInfo.apiKey)}&maxWidth=400`;
  const background = `${authInfo.serverUrl}${authInfo.prefix}/Items/${item.Id}/Images/Backdrop?api_key=${encodeURIComponent(authInfo.apiKey)}&maxWidth=1280`;

  return {
    id,
    type: isSeries ? "series" : "movie",
    name,
    poster,
    background,
    posterShape: "poster",
    releaseInfo: item.ProductionYear ? String(item.ProductionYear) : undefined,
    description: item.Overview || undefined,
    genres: item.Genres || []
  };
}

function getDefaultCatalogs() {
  const standardYears = [
    "2026", "2025", "2024", "2023", "2022", "2021", "2020",
    "2019", "2018", "2017", "2016", "2015", "2010s", "2000s", "1990s"
  ];
  return [
    {
      type: "movie",
      id: "emby_movies_resume",
      name: "Filmler - İzlemeye Devam Et",
      extra: [{ name: "skip", isRequired: false }]
    },
    {
      type: "movie",
      id: "emby_movies_latest",
      name: "Filmler - Son Eklenenler",
      extra: [{ name: "skip", isRequired: false }]
    },
    {
      type: "movie",
      id: "emby_all_movies",
      name: "Filmler - Tümü (A-Z)",
      extra: [
        { name: "genre", options: ["Aksiyon", "Gerilim", "Suç", "Macera", "Korku", "Gizem", "Dram", "Romantik", "Fantastik", "Komedi", "Bilim-Kurgu", "Animasyon", "Aile", "Belgesel"], isRequired: false },
        { name: "year", options: standardYears, isRequired: false },
        { name: "search", isRequired: false },
        { name: "skip", isRequired: false }
      ]
    },
    {
      type: "series",
      id: "emby_series_resume",
      name: "Diziler - İzlemeye Devam Et",
      extra: [{ name: "skip", isRequired: false }]
    },
    {
      type: "series",
      id: "emby_series_latest",
      name: "Diziler - Son Eklenenler",
      extra: [{ name: "skip", isRequired: false }]
    },
    {
      type: "series",
      id: "emby_all_series",
      name: "Diziler - Tümü (A-Z)",
      extra: [
        { name: "genre", options: ["Aksiyon", "Gerilim", "Suç", "Macera", "Korku", "Gizem", "Dram", "Romantik", "Komedi", "Bilim-Kurgu", "Animasyon"], isRequired: false },
        { name: "year", options: standardYears, isRequired: false },
        { name: "search", isRequired: false },
        { name: "skip", isRequired: false }
      ]
    },
    {
      type: "movie",
      id: "emby_boxsets",
      name: "Koleksiyonlar (Film Serileri)",
      extra: [
        { name: "search", isRequired: false },
        { name: "skip", isRequired: false }
      ]
    }
  ];
}

async function getEmbyCatalogs(authInfo) {
  if (!authInfo || !authInfo.apiKey || !authInfo.userId) return getDefaultCatalogs();

  const cacheKey = `${authInfo.serverUrl}:${authInfo.userId}`;
  const now = Date.now();
  if (catalogsCache.has(cacheKey)) {
    const cached = catalogsCache.get(cacheKey);
    if (now - cached.timestamp < 30 * 60 * 1000) return cached.catalogs;
  }

  try {
    const viewsUrl = `${authInfo.serverUrl}${authInfo.prefix}/Users/${authInfo.userId}/Views?api_key=${encodeURIComponent(authInfo.apiKey)}`;
    const vRes = await fetch(viewsUrl, { headers: { "Accept": "application/json" } });
    if (!vRes.ok) return getDefaultCatalogs();
    const vData = await vRes.json();
    const views = vData.Items || [];
    if (views.length === 0) return getDefaultCatalogs();

    const standardYears = [
      "2026", "2025", "2024", "2023", "2022", "2021", "2020",
      "2019", "2018", "2017", "2016", "2015", "2014", "2013",
      "2012", "2011", "2010", "2000s", "1990s", "1980s", "1970s"
    ];

    async function fetchGenres(parentId) {
      try {
        const gUrl = `${authInfo.serverUrl}${authInfo.prefix}/Genres?ParentId=${parentId}&UserId=${authInfo.userId}&api_key=${encodeURIComponent(authInfo.apiKey)}`;
        const gRes = await fetch(gUrl, { headers: { "Accept": "application/json" } });
        if (gRes.ok) {
          const gData = await gRes.json();
          return (gData.Items || []).map(g => g.Name).filter(Boolean);
        }
      } catch (e) {}
      return [];
    }

    const catalogs = [];

    for (const v of views) {
      const colType = (v.CollectionType || "").toLowerCase();
      const isTv = colType === "tvshows";
      const isMovies = colType === "movies";
      const isBoxsets = colType === "boxsets";
      const isPlaylists = colType === "playlists";

      if (isMovies) {
        const genres = await fetchGenres(v.Id);
        const movieExtra = [
          { name: "search", isRequired: false },
          { name: "skip", isRequired: false }
        ];
        if (genres.length > 0) {
          movieExtra.unshift({ name: "genre", options: genres, isRequired: false });
        }
        movieExtra.splice(genres.length > 0 ? 1 : 0, 0, { name: "year", options: standardYears, isRequired: false });

        // 1. İzlemeye Devam Et (Continue Watching)
        catalogs.push({
          type: "movie",
          id: `emby_lib_${v.Id}_resume`,
          name: `${v.Name} - İzlemeye Devam Et`,
          extra: [{ name: "skip", isRequired: false }]
        });

        // 2. Son Eklenenler (Latest)
        catalogs.push({
          type: "movie",
          id: `emby_lib_${v.Id}_latest`,
          name: `${v.Name} - Son Eklenenler`,
          extra: [{ name: "skip", isRequired: false }]
        });

        // 3. Tümü (A - Z) with Filters
        catalogs.push({
          type: "movie",
          id: `emby_lib_${v.Id}_all`,
          name: `${v.Name} - Tümü (A-Z)`,
          extra: movieExtra
        });

        // 4. En Çok Oy Alanlar
        catalogs.push({
          type: "movie",
          id: `emby_lib_${v.Id}_top`,
          name: `${v.Name} - En Çok Oy Alanlar`,
          extra: [{ name: "skip", isRequired: false }]
        });
      } else if (isTv) {
        const genres = await fetchGenres(v.Id);
        const tvExtra = [
          { name: "search", isRequired: false },
          { name: "skip", isRequired: false }
        ];
        if (genres.length > 0) {
          tvExtra.unshift({ name: "genre", options: genres, isRequired: false });
        }
        tvExtra.splice(genres.length > 0 ? 1 : 0, 0, { name: "year", options: standardYears, isRequired: false });

        // 1. İzlemeye Devam Et
        catalogs.push({
          type: "series",
          id: `emby_lib_${v.Id}_resume`,
          name: `${v.Name} - İzlemeye Devam Et`,
          extra: [{ name: "skip", isRequired: false }]
        });

        // 2. Son Eklenenler
        catalogs.push({
          type: "series",
          id: `emby_lib_${v.Id}_latest`,
          name: `${v.Name} - Son Eklenenler`,
          extra: [{ name: "skip", isRequired: false }]
        });

        // 3. Tümü (A - Z) with Filters
        catalogs.push({
          type: "series",
          id: `emby_lib_${v.Id}_all`,
          name: `${v.Name} - Tümü (A-Z)`,
          extra: tvExtra
        });

        // 4. En Çok Oy Alanlar
        catalogs.push({
          type: "series",
          id: `emby_lib_${v.Id}_top`,
          name: `${v.Name} - En Çok Oy Alanlar`,
          extra: [{ name: "skip", isRequired: false }]
        });
      } else if (isBoxsets) {
        catalogs.push({
          type: "movie",
          id: `emby_lib_${v.Id}_boxsets`,
          name: `${v.Name} (Film Serileri)`,
          extra: [
            { name: "search", isRequired: false },
            { name: "skip", isRequired: false }
          ]
        });
      } else if (isPlaylists) {
        catalogs.push({
          type: "movie",
          id: `emby_lib_${v.Id}_playlists`,
          name: v.Name,
          extra: [
            { name: "search", isRequired: false },
            { name: "skip", isRequired: false }
          ]
        });
      } else {
        catalogs.push({
          type: isTv ? "series" : "movie",
          id: `emby_lib_${v.Id}_all`,
          name: v.Name,
          extra: [
            { name: "search", isRequired: false },
            { name: "skip", isRequired: false }
          ]
        });
      }
    }

    if (catalogs.length > 0) {
      catalogsCache.set(cacheKey, { catalogs, timestamp: now });
      return catalogs;
    }
  } catch (err) {}

  return getDefaultCatalogs();
}

async function resolveCatalog(config, catalogType, catalogId, extraStr, searchParams) {
  const authInfo = await getEmbyAuthAndInfo(config);
  if (!authInfo || !authInfo.apiKey || !authInfo.userId) return { metas: [] };

  const extraArgs = parseExtraArgs(extraStr, searchParams);
  const genre = extraArgs.genre;
  const year = extraArgs.year;
  const search = extraArgs.search;
  const skip = Number(extraArgs.skip) || 0;

  const viewMatch = catalogId.match(/^emby_lib_([a-zA-Z0-9-]+)(?:_([a-z]+))?$/);
  const viewId = viewMatch ? viewMatch[1] : null;
  const subType = (viewMatch && viewMatch[2]) || (catalogId.includes("_resume") ? "resume" : (catalogId.includes("_latest") ? "latest" : (catalogId.includes("_boxsets") ? "boxsets" : "all")));

  // 0. Handle individual BoxSet contents (movie franchise folders)
  if (catalogId.startsWith("emby_boxset_")) {
    const boxsetId = catalogId.replace("emby_boxset_", "");
    try {
      const url = `${authInfo.serverUrl}${authInfo.prefix}/Users/${authInfo.userId}/Items?ParentId=${encodeURIComponent(boxsetId)}&Fields=Genres,ProductionYear,Overview,ProviderIds,PremiereDate&SortBy=SortName&SortOrder=Ascending&api_key=${encodeURIComponent(authInfo.apiKey)}`;
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "X-Emby-Token": authInfo.apiKey,
          "X-MediaBrowser-Token": authInfo.apiKey
        }
      });
      if (res.ok) {
        const data = await res.json();
        const metas = (data.Items || []).map(item => formatEmbyItemToMeta(item, authInfo, "movie"));
        return { metas };
      }
    } catch (e) {}
    return { metas: [] };
  }

  const isTv = catalogType === "series";
  let queryParams = [
    "Recursive=true",
    `api_key=${encodeURIComponent(authInfo.apiKey)}`,
    "Fields=Genres,ProductionYear,ProviderIds,Overview,PrimaryImageAspectRatio,PremiereDate,SeriesName,SeriesId,IndexNumber,ParentIndexNumber",
    `StartIndex=${skip}`,
    "Limit=50"
  ];

  if (viewId && viewId !== "movies" && viewId !== "series" && viewId !== "all") {
    queryParams.push(`ParentId=${encodeURIComponent(viewId)}`);
  }

  if (subType === "resume") {
    queryParams.push("Filters=IsResumable");
    queryParams.push("SortBy=DatePlayed");
    queryParams.push("SortOrder=Descending");
    if (isTv) {
      queryParams.push("IncludeItemTypes=Episode,Series");
    } else {
      queryParams.push("IncludeItemTypes=Movie");
    }
  } else if (subType === "latest") {
    queryParams.push("SortBy=DateCreated");
    queryParams.push("SortOrder=Descending");
    if (isTv) {
      queryParams.push("IncludeItemTypes=Series");
    } else {
      queryParams.push("IncludeItemTypes=Movie");
    }
  } else if (subType === "top") {
    queryParams.push("SortBy=CommunityRating,SortName");
    queryParams.push("SortOrder=Descending");
    if (isTv) {
      queryParams.push("IncludeItemTypes=Series");
    } else {
      queryParams.push("IncludeItemTypes=Movie");
    }
  } else if (subType === "boxsets") {
    queryParams.push("SortBy=SortName");
    queryParams.push("SortOrder=Ascending");
    queryParams.push("IncludeItemTypes=BoxSet");
  } else if (subType === "playlists") {
    queryParams.push("SortBy=SortName");
    queryParams.push("SortOrder=Ascending");
    queryParams.push("IncludeItemTypes=Playlist");
  } else {
    if (isTv) {
      queryParams.push("IncludeItemTypes=Series");
    } else {
      queryParams.push("IncludeItemTypes=Movie,BoxSet");
    }
    if (search) {
      queryParams.push(`SearchTerm=${encodeURIComponent(search)}`);
      queryParams.push("SortBy=SortName");
      queryParams.push("SortOrder=Ascending");
    } else {
      queryParams.push("SortBy=SortName");
      queryParams.push("SortOrder=Ascending");
    }
  }

  if (genre) {
    queryParams.push(`Genres=${encodeURIComponent(genre)}`);
  }

  if (year) {
    const decadeMatch = String(year).match(/^(d{4})s$/i);
    if (decadeMatch) {
      const startYear = parseInt(decadeMatch[1], 10);
      const yearsArr = [];
      for (let y = startYear; y < startYear + 10; y++) yearsArr.push(y);
      queryParams.push(`Years=${yearsArr.join(",")}`);
    } else {
      queryParams.push(`Years=${encodeURIComponent(year)}`);
    }
  }

  const url = `${authInfo.serverUrl}${authInfo.prefix}/Users/${authInfo.userId}/Items?${queryParams.join("&")}`;
  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "X-Emby-Token": authInfo.apiKey,
        "X-MediaBrowser-Token": authInfo.apiKey
      }
    });

    if (!res.ok) return { metas: [] };
    const data = await res.json();
    const metas = (data.Items || []).map(item => formatEmbyItemToMeta(item, authInfo, catalogType));
    return { metas };
  } catch (e) {
    return { metas: [] };
  }
}

async function resolveMeta(config, metaType, rawId) {
  const authInfo = await getEmbyAuthAndInfo(config);
  if (!authInfo || !authInfo.apiKey || !authInfo.userId) return { meta: null };

  const apiHeaders = {
    "Accept": "application/json",
    "X-Emby-Token": authInfo.apiKey,
    "X-MediaBrowser-Token": authInfo.apiKey
  };

  // 1. BoxSet: emby:boxset:12345 (Movie Franchise Collection)
  if (rawId.startsWith("emby:boxset:")) {
    const boxsetId = rawId.replace("emby:boxset:", "");
    try {
      const bRes = await fetch(`${authInfo.serverUrl}${authInfo.prefix}/Users/${authInfo.userId}/Items/${boxsetId}?api_key=${encodeURIComponent(authInfo.apiKey)}`, { headers: apiHeaders });
      if (!bRes.ok) return { meta: null };
      const boxset = await bRes.json();

      const cRes = await fetch(`${authInfo.serverUrl}${authInfo.prefix}/Users/${authInfo.userId}/Items?ParentId=${boxsetId}&Fields=Genres,ProductionYear,Overview,ProviderIds,PremiereDate&SortBy=SortName&SortOrder=Ascending&api_key=${encodeURIComponent(authInfo.apiKey)}`, { headers: apiHeaders });
      const cData = cRes.ok ? await cRes.json() : { Items: [] };
      const children = cData.Items || [];

      const poster = `${authInfo.serverUrl}${authInfo.prefix}/Items/${boxset.Id}/Images/Primary?api_key=${encodeURIComponent(authInfo.apiKey)}&maxWidth=400`;
      const background = `${authInfo.serverUrl}${authInfo.prefix}/Items/${boxset.Id}/Images/Backdrop?api_key=${encodeURIComponent(authInfo.apiKey)}&maxWidth=1280`;

      const filmTitles = children.map((c, idx) => `• ${idx + 1}. ${c.Name} (${c.ProductionYear || ''})`).join("\n");
      const desc = `${boxset.Name} Film Koleksiyonu (${children.length} Film)\n\nİçerdiği Filmler:\n${filmTitles}${boxset.Overview ? `\n\n${boxset.Overview}` : ""}`;

      return {
        meta: {
          id: rawId,
          type: "movie",
          name: boxset.Name,
          poster,
          background,
          posterShape: "poster",
          description: desc,
          genres: boxset.Genres && boxset.Genres.length ? boxset.Genres : ["Film Serisi", "Koleksiyon"],
          releaseInfo: `${children.length} Film`
        }
      };
    } catch (e) {
      return { meta: null };
    }
  }

  // 2. Direct Emby Item: emby:item:12345 or emby:12345
  if (rawId.startsWith("emby:item:") || rawId.startsWith("emby:")) {
    const itemId = rawId.replace(/^emby:(item:)?/, "");
    try {
      const iRes = await fetch(`${authInfo.serverUrl}${authInfo.prefix}/Users/${authInfo.userId}/Items/${itemId}?api_key=${encodeURIComponent(authInfo.apiKey)}`, { headers: apiHeaders });
      if (!iRes.ok) return { meta: null };
      const item = await iRes.json();

      const poster = `${authInfo.serverUrl}${authInfo.prefix}/Items/${item.Id}/Images/Primary?api_key=${encodeURIComponent(authInfo.apiKey)}&maxWidth=400`;
      const background = `${authInfo.serverUrl}${authInfo.prefix}/Items/${item.Id}/Images/Backdrop?api_key=${encodeURIComponent(authInfo.apiKey)}&maxWidth=1280`;

      const isSeries = item.Type === "Series";
      let videos = undefined;

      if (isSeries) {
        const epRes = await fetch(`${authInfo.serverUrl}${authInfo.prefix}/Shows/${itemId}/Episodes?UserId=${authInfo.userId}&Fields=MediaSources,Name,Id,IndexNumber,ParentIndexNumber,PremiereDate,Overview&api_key=${encodeURIComponent(authInfo.apiKey)}`, { headers: apiHeaders });
        if (epRes.ok) {
          const epData = await epRes.json();
          videos = (epData.Items || []).map(ep => ({
            id: `emby:item:${ep.Id}`,
            title: ep.Name || `Bölüm ${ep.IndexNumber}`,
            season: ep.ParentIndexNumber !== undefined ? ep.ParentIndexNumber : 1,
            episode: ep.IndexNumber !== undefined ? ep.IndexNumber : 1,
            released: ep.PremiereDate,
            overview: ep.Overview
          }));
        }
      }

      return {
        meta: {
          id: rawId,
          type: isSeries ? "series" : "movie",
          name: item.Name,
          poster,
          background,
          posterShape: "poster",
          releaseInfo: item.ProductionYear ? String(item.ProductionYear) : undefined,
          description: item.Overview || undefined,
          genres: item.Genres || [],
          videos
        }
      };
    } catch (e) {
      return { meta: null };
    }
  }

  // 3. Fallback for IMDb (tt...) or TMDB (tmdb:...)
  if (rawId.startsWith("tt") || rawId.startsWith("tmdb:")) {
    try {
      const idInfo = parseInputId(rawId, metaType === "series" ? "tv" : "movie");
      const isSeries = idInfo.mediaType === "tv";
      const itemType = isSeries ? "Series" : "Movie";
      const providerFormats = idInfo.isImdb
        ? [`imdb.${idInfo.cleanId}`, `Imdb.${idInfo.cleanId}`]
        : [`tmdb.${idInfo.cleanId}`, `Tmdb.${idInfo.cleanId}`];

      for (const pId of providerFormats) {
        const sUrl = `${authInfo.serverUrl}${authInfo.prefix}/Users/${authInfo.userId}/Items?AnyProviderIdEquals=${encodeURIComponent(pId)}&IncludeItemTypes=${itemType}&Recursive=true&Fields=ProviderIds,Name,Id,MediaSources,Overview,Genres,ProductionYear&api_key=${encodeURIComponent(authInfo.apiKey)}`;
        const sRes = await fetch(sUrl, { headers: apiHeaders });
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.Items && sData.Items.length > 0) {
            const foundItem = sData.Items[0];
            return await resolveMeta(config, metaType, foundItem.Type === "BoxSet" ? `emby:boxset:${foundItem.Id}` : `emby:item:${foundItem.Id}`);
          }
        }
      }
    } catch (e) {}
  }

  return { meta: null };
}

async function generateNuvioCollections(authInfo, configToken, userConfig) {
  if (!authInfo || !authInfo.apiKey || !authInfo.userId) {
    return [
      {
        id: "collection-benim-medyam",
        title: "Benim Medyam",
        viewMode: "FOLLOW_HOME",
        focusGlowEnabled: true,
        folders: []
      }
    ];
  }

  try {
    const viewsUrl = `${authInfo.serverUrl}${authInfo.prefix}/Users/${authInfo.userId}/Views?api_key=${encodeURIComponent(authInfo.apiKey)}`;
    const vRes = await fetch(viewsUrl, { headers: { "Accept": "application/json" } });
    if (!vRes.ok) return [];
    const vData = await vRes.json();
    const views = vData.Items || [];

    const folders = [];
    let boxsetsViewId = null;

    for (const v of views) {
      const colType = (v.CollectionType || "").toLowerCase();
      const isTv = colType === "tvshows";
      const isMovies = colType === "movies";
      const isBoxsets = colType === "boxsets";
      const isPlaylists = colType === "playlists";

      if (isBoxsets) boxsetsViewId = v.Id;

      const coverImageUrl = `${authInfo.serverUrl}${authInfo.prefix}/Items/${v.Id}/Images/Primary?maxWidth=600&api_key=${encodeURIComponent(authInfo.apiKey)}`;
      const catalogSources = [];

      if (isMovies) {
        catalogSources.push(
          { addonId: "org.omc725.nuvioemby", catalogId: `emby_lib_${v.Id}_resume`, type: "movie" },
          { addonId: "org.omc725.nuvioemby", catalogId: `emby_lib_${v.Id}_latest`, type: "movie" },
          { addonId: "org.omc725.nuvioemby", catalogId: `emby_lib_${v.Id}_all`, type: "movie" },
          { addonId: "org.omc725.nuvioemby", catalogId: `emby_lib_${v.Id}_top`, type: "movie" }
        );
      } else if (isTv) {
        catalogSources.push(
          { addonId: "org.omc725.nuvioemby", catalogId: `emby_lib_${v.Id}_resume`, type: "series" },
          { addonId: "org.omc725.nuvioemby", catalogId: `emby_lib_${v.Id}_latest`, type: "series" },
          { addonId: "org.omc725.nuvioemby", catalogId: `emby_lib_${v.Id}_all`, type: "series" },
          { addonId: "org.omc725.nuvioemby", catalogId: `emby_lib_${v.Id}_top`, type: "series" }
        );
      } else if (isBoxsets) {
        catalogSources.push(
          { addonId: "org.omc725.nuvioemby", catalogId: `emby_lib_${v.Id}_boxsets`, type: "movie" }
        );
      } else if (isPlaylists) {
        catalogSources.push(
          { addonId: "org.omc725.nuvioemby", catalogId: `emby_lib_${v.Id}_playlists`, type: "movie" }
        );
      }

      folders.push({
        id: `folder-emby-${v.Id}`,
        title: v.Name,
        hideTitle: false,
        tileShape: "LANDSCAPE",
        coverEmoji: isMovies ? "🎬" : (isTv ? "📺" : (isBoxsets ? "📦" : "📑")),
        coverImageUrl,
        heroBackdropUrl: coverImageUrl,
        focusGifEnabled: false,
        catalogSources,
        sources: []
      });
    }

    const collections = [
      {
        id: "collection-benim-medyam",
        title: "Benim Medyam",
        viewMode: "FOLLOW_HOME",
        focusGlowEnabled: true,
        folders
      }
    ];

    // If Emby has a BoxSets library, also create the "Film Koleksiyonları (Seriler)" collection with individual franchise folders
    if (boxsetsViewId) {
      try {
        const bUrl = `${authInfo.serverUrl}${authInfo.prefix}/Users/${authInfo.userId}/Items?ParentId=${boxsetsViewId}&Fields=Id,Name,ImageTags&SortBy=SortName&SortOrder=Ascending&api_key=${encodeURIComponent(authInfo.apiKey)}`;
        const bRes = await fetch(bUrl, { headers: { "Accept": "application/json" } });
        if (bRes.ok) {
          const bData = await bRes.json();
          const boxsets = bData.Items || [];
          if (boxsets.length > 0) {
            const franchiseFolders = boxsets.map(b => {
              const bCover = `${authInfo.serverUrl}${authInfo.prefix}/Items/${b.Id}/Images/Primary?maxWidth=400&api_key=${encodeURIComponent(authInfo.apiKey)}`;
              const bBackdrop = `${authInfo.serverUrl}${authInfo.prefix}/Items/${b.Id}/Images/Backdrop?maxWidth=1280&api_key=${encodeURIComponent(authInfo.apiKey)}`;
              return {
                id: `folder-boxset-${b.Id}`,
                title: b.Name,
                hideTitle: false,
                tileShape: "POSTER",
                coverEmoji: "🎬",
                coverImageUrl: bCover,
                heroBackdropUrl: bBackdrop,
                focusGifEnabled: false,
                catalogSources: [
                  { addonId: "org.omc725.nuvioemby", catalogId: `emby_boxset_${b.Id}`, type: "movie" }
                ],
                sources: []
              };
            });

            collections.push({
              id: "collection-film-serileri",
              title: "Film Koleksiyonları (Seriler)",
              viewMode: "FOLLOW_LAYOUT",
              showAllTab: true,
              focusGlowEnabled: true,
              folders: franchiseFolders
            });
          }
        }
      } catch (e) {}
    }

    return collections;
  } catch (err) {
    return [];
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle OPTIONS CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // 1. Connection Test Proxy (POST /api/test-connection)
    if (pathname === '/api/test-connection') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ ok: false, error: 'Yalnızca POST istekleri kabul edilir.' }), {
          status: 405,
          headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
        });
      }

      try {
        const body = await request.json();
        let serverUrl = (body.serverUrl || '').trim().replace(/\/+$/, '');
        const username = (body.username || '').trim();
        const password = body.password || '';

        if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
          serverUrl = 'http://' + serverUrl;
        }

        let info = null;
        let effectivePrefix = '';
        let serverType = 'emby';

        for (const prefix of ['', '/emby']) {
          try {
            const r = await fetch(`${serverUrl}${prefix}/System/Info/Public`, {
              headers: { 'Accept': 'application/json' }
            });
            if (r.ok) {
              info = await r.json();
              effectivePrefix = prefix;
              const prod = ((info && (info.ProductName || info.ServerName)) || '').toLowerCase();
              if (prod.includes('jellyfin')) {
                serverType = 'jellyfin';
                effectivePrefix = '';
              }
              break;
            }
          } catch (e) {}
        }

        if (!info) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'Emby / Jellyfin sunucusuna bağlanılamadı. Adresi (ve varsa port numarasını) kontrol edin.'
          }), {
            status: 200,
            headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
          });
        }

        let authResult = null;
        if (username) {
          const authEndpoints = [`${serverUrl}${effectivePrefix}/Users/AuthenticateByName`];
          if (effectivePrefix !== '') authEndpoints.push(`${serverUrl}/Users/AuthenticateByName`);
          else authEndpoints.push(`${serverUrl}/emby/Users/AuthenticateByName`);

          for (const authUrl of authEndpoints) {
            try {
              const authRes = await fetch(authUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Emby-Authorization': 'MediaBrowser Client="Nuvio Configurator", Device="Web", DeviceId="nuvio-worker-test", Version="3.5.0"',
                  'Authorization': 'MediaBrowser Client="Nuvio Configurator", Device="Web", DeviceId="nuvio-worker-test", Version="3.5.0"'
                },
                body: JSON.stringify({ Username: username, Pw: password })
              });

              if (authRes.ok) {
                authResult = await authRes.json();
                break;
              }
            } catch (authErr) {}
          }

          if (!authResult) {
            return new Response(JSON.stringify({
              ok: false,
              error: 'Sunucu bulundu ancak kullanıcı adı veya şifre geçersiz.'
            }), {
              status: 200,
              headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
            });
          }
        }

        let libraries = [];
        if (authResult && authResult.User && authResult.AccessToken) {
          try {
            const vRes = await fetch(`${serverUrl}${effectivePrefix}/Users/${authResult.User.Id}/Views?api_key=${encodeURIComponent(authResult.AccessToken)}`, {
              headers: { 'Accept': 'application/json' }
            });
            if (vRes.ok) {
              const vData = await vRes.json();
              libraries = (vData.Items || []).map(v => ({
                id: v.Id,
                name: v.Name,
                type: (v.CollectionType || v.Type || '').toLowerCase()
              }));
            }
          } catch (e) {}
        }

        const serverDisplayName = serverType === 'jellyfin' ? 'Jellyfin Server' : 'Emby Server';
        return new Response(JSON.stringify({
          ok: true,
          serverType: serverType,
          serverName: info.ServerName || serverDisplayName,
          productName: info.ProductName || serverDisplayName,
          version: info.Version || 'Bilinmiyor',
          userName: authResult && authResult.User ? authResult.User.Name : username,
          libraries: libraries
        }), {
          status: 200,
          headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 200,
          headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
        });
      }
    }

    // 2. Web Configurator Interface (GET / and /configure)
    if (pathname === '/' || pathname === '/configure') {
      return new Response(HTML_PAGE, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // 3. Root Fallback manifest & js (without config)
    if (pathname === '/manifest.json') {
      return new Response(JSON.stringify(BASE_MANIFEST, null, 2), {
        status: 200,
        headers: corsHeaders({
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache'
        })
      });
    }

    if (pathname === '/providers/emby.js' || pathname === '/emby.js') {
      return new Response(EMBY_BASE_CODE, {
        status: 200,
        headers: corsHeaders({
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-cache'
        })
      });
    }

    // 4. Stremio / Nuvio Catalog Resolution: /:config/catalog/:type/:id.json or /:config/catalog/:type/:id/:extra.json
    const catalogMatch = pathname.match(/^\/([^\/]+)\/catalog\/([^\/]+)\/([^\/]+?)(?:\/(.+))?\.json$/);
    if (catalogMatch) {
      const configToken = catalogMatch[1];
      const catalogType = catalogMatch[2];
      const catalogId = catalogMatch[3];
      const extraStr = catalogMatch[4] ? decodeURIComponent(catalogMatch[4]) : '';

      const userConfig = decodeBase64Url(configToken);
      if (!userConfig) {
        return new Response(JSON.stringify({ metas: [] }), {
          status: 400,
          headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
        });
      }

      try {
        const catalogRes = await resolveCatalog(userConfig, catalogType, catalogId, extraStr, url.searchParams);
        return new Response(JSON.stringify(catalogRes), {
          status: 200,
          headers: corsHeaders({
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=60'
          })
        });
      } catch (err) {
        return new Response(JSON.stringify({ metas: [] }), {
          status: 200,
          headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
        });
      }
    }

    // 5. Stremio / Nuvio Meta Resolution: /:config/meta/:type/:id.json
    const metaMatch = pathname.match(/^\/([^\/]+)\/meta\/([^\/]+)\/([^\/]+)\.json$/);
    if (metaMatch) {
      const configToken = metaMatch[1];
      const metaType = metaMatch[2];
      const rawId = decodeURIComponent(metaMatch[3]);

      const userConfig = decodeBase64Url(configToken);
      if (!userConfig) {
        return new Response(JSON.stringify({ meta: null }), {
          status: 400,
          headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
        });
      }

      try {
        const metaRes = await resolveMeta(userConfig, metaType, rawId);
        return new Response(JSON.stringify(metaRes), {
          status: 200,
          headers: corsHeaders({
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=300'
          })
        });
      } catch (err) {
        return new Response(JSON.stringify({ meta: null }), {
          status: 200,
          headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
        });
      }
    }

    // 6. Stremio Addon Stream Resolution: /:config/stream/:type/:id.json
    const streamMatch = pathname.match(/^\/([^\/]+)\/stream\/([^\/]+)\/([^\/]+)\.json$/);
    if (streamMatch) {
      const configToken = streamMatch[1];
      const streamType = streamMatch[2];
      const rawId = decodeURIComponent(streamMatch[3]);

      const userConfig = decodeBase64Url(configToken);
      if (!userConfig) {
        return new Response(JSON.stringify({ streams: [] }), {
          status: 400,
          headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
        });
      }

      try {
        const streams = await resolveEmbyStreams(userConfig, streamType, rawId);
        return new Response(JSON.stringify({ streams }), {
          status: 200,
          headers: corsHeaders({
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=120'
          })
        });
      } catch (err) {
        return new Response(JSON.stringify({ streams: [] }), {
          status: 200,
          headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
        });
      }
    }

    // 7. Dynamic Path with Config: /:config/manifest.json or /:config/(providers/)?emby.js
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      const configToken = pathParts[0];
      const remainingPath = pathParts.slice(1).join('/');

      const userConfig = decodeBase64Url(configToken);
      if (!userConfig) {
        return new Response(JSON.stringify({ error: 'Geçersiz yapılandırma anahtarı (invalid base64 config).' }), {
          status: 400,
          headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
        });
      }

      // Personalized Manifest (Stremio + Nuvio Scraper)
            // Nuvio Collections JSON export: /:config/collections.json
      if (remainingPath === "collections.json" || remainingPath === "collections") {
        let authInfo = null;
        try {
          authInfo = await getEmbyAuthAndInfo(userConfig);
        } catch (e) {}
        const collections = await generateNuvioCollections(authInfo, configToken, userConfig);
        return new Response(JSON.stringify(collections, null, 2), {
          status: 200,
          headers: corsHeaders({
            "Content-Type": "application/json; charset=utf-8",
            'Content-Disposition': 'inline; filename="collections.json"',
            "Cache-Control": "public, max-age=300"
          })
        });
      }

if (remainingPath === 'manifest.json') {
        const customManifest = JSON.parse(JSON.stringify(BASE_MANIFEST));
        let authInfo = null;
        try {
          authInfo = await getEmbyAuthAndInfo(userConfig);
        } catch (e) {}

        const serverType = (authInfo && authInfo.serverType) || ((userConfig.serverType === 'jellyfin' || (userConfig.serverUrl && userConfig.serverUrl.toLowerCase().includes('jellyfin'))) ? 'jellyfin' : 'emby');
        const displayName = serverType === 'jellyfin' ? 'Jellyfin' : 'Emby';

        if (userConfig.username) {
          customManifest.name = `${displayName} (${userConfig.username})`;
        } else {
          customManifest.name = displayName;
        }

        if (customManifest.scrapers && customManifest.scrapers.length > 0) {
          customManifest.scrapers[0].hasSettings = false;
          customManifest.scrapers[0].name = displayName;
          if (userConfig.serverUrl) {
            customManifest.scrapers[0].description = `${displayName} (${userConfig.serverUrl})`;
          }
        }

        // Dynamically load user's Emby libraries as catalogs with genres & years
        if (authInfo) {
          try {
            const catalogs = await getEmbyCatalogs(authInfo);
            if (catalogs && catalogs.length > 0) {
              customManifest.catalogs = catalogs;
            }
          } catch (e) {}
        }
        if (!customManifest.catalogs || customManifest.catalogs.length === 0) {
          customManifest.catalogs = getDefaultCatalogs();
        }

        return new Response(JSON.stringify(customManifest, null, 2), {
          status: 200,
          headers: corsHeaders({
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=600'
          })
        });
      }

      // Personalized JS Provider Code
      if (remainingPath === 'providers/emby.js' || remainingPath === 'emby.js') {
        const customizedJs = generateCustomEmbyCode(EMBY_BASE_CODE, userConfig);
        return new Response(customizedJs, {
          status: 200,
          headers: corsHeaders({
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
          })
        });
      }
    }

    // 404 Not Found
    return new Response('404 Sayfa Bulunamadı / Not Found', {
      status: 404,
      headers: corsHeaders({ 'Content-Type': 'text/plain; charset=utf-8' })
    });
  }
};
