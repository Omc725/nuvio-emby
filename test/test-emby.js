/**
 * Test Suite for Nuvio Emby Provider
 */
const assert = require("assert");

// We will mock global.fetch to simulate Emby server responses
const mockServerUrl = "http://localhost:8096";
const mockApiKey = "test_api_key_123";
const mockUserId = "test_user_id_456";

// Load emby.js with test CONFIG injected
const fs = require("fs");
const path = require("path");

let embyCode = fs.readFileSync(path.join(__dirname, "../emby.js"), "utf8");

// Replace CONFIG with test values for automated testing
embyCode = embyCode.replace(
  /const CONFIG = \{[\s\S]*?\};/,
  `const CONFIG = {
    serverUrl: "${mockServerUrl}",
    apiKey: "${mockApiKey}",
    userId: "${mockUserId}"
  };`
);

// Function to evaluate emby.js in isolated scope with custom fetch
function loadProvider(customFetch) {
  const customModule = { exports: {} };
  const fn = new Function("module", "exports", "fetch", "console", embyCode);
  fn(customModule, customModule.exports, customFetch, console);
  return customModule.exports;
}

async function runTests() {
  console.log("=== Running Emby Provider Tests ===\n");

  // TEST 1: Movie Stream Resolution with TMDB ID
  {
    console.log("Test 1: Movie stream resolution with numeric TMDB ID (550)...");
    const mockFetch = async (url, options = {}) => {
      const urlStr = String(url);
      
      // Movie Search endpoint
      if (urlStr.includes("/Items?AnyProviderIdEquals=tmdb.550")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            Items: [{ Id: "movie_item_550", Name: "Fight Club" }]
          })
        };
      }

      // PlaybackInfo endpoint
      if (urlStr.includes("/Items/movie_item_550/PlaybackInfo")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            MediaSources: [
              {
                Id: "media_source_fight_club_1080p",
                Bitrate: 24000000,
                MediaStreams: [
                  {
                    Type: "Video",
                    Codec: "hevc",
                    Width: 1920,
                    Height: 1080,
                    BitRate: 24000000
                  },
                  {
                    Type: "Audio",
                    Codec: "ac3",
                    ChannelLayout: "5.1",
                    Channels: 6
                  },
                  {
                    Type: "Subtitle",
                    Index: 2,
                    Codec: "subrip",
                    IsExternal: true,
                    Language: "tur",
                    DisplayTitle: "Türkçe"
                  },
                  {
                    Type: "Subtitle",
                    Index: 3,
                    Codec: "vtt",
                    IsExternal: false,
                    Language: "eng",
                    DisplayTitle: "English"
                  }
                ]
              }
            ]
          })
        };
      }

      throw new Error(`Unhandled mock URL: ${urlStr}`);
    };

    const provider = loadProvider(mockFetch);
    const streams = await provider.getStreams(550, "movie");

    assert.strictEqual(streams.length, 1, "Should return 1 stream");
    const s = streams[0];
    assert(s.name.includes("Emby"), "Name should identify as Emby");
    assert(s.description.includes("1080p"), "Description should include 1080p");
    assert.strictEqual(s.quality, "1080p", "Quality should be 1080p");
    assert(s.title.includes("HEVC"), "Title should match video codec format");
    assert.strictEqual(s.headers["X-Emby-Token"], mockApiKey, "Header should have X-Emby-Token");
    assert.strictEqual(
      s.url,
      `${mockServerUrl}/emby/Videos/movie_item_550/stream.mp4?static=true&MediaSourceId=media_source_fight_club_1080p&api_key=${mockApiKey}`,
      "URL should match stream template"
    );
    assert.strictEqual(s.subtitles.length, 2, "Should extract 2 subtitles");
    assert.strictEqual(s.subtitles[0].lang, "tr", "tur should normalize to tr");
    assert.strictEqual(s.subtitles[0].label, "Türkçe", "Label should be Türkçe");
    assert.strictEqual(
      s.subtitles[0].url,
      `${mockServerUrl}/emby/Videos/movie_item_550/media_source_fight_club_1080p/Subtitles/2/Stream.vtt?api_key=${mockApiKey}`
    );
    assert.strictEqual(s.subtitles[1].lang, "en", "eng should normalize to en");
    console.log("✓ Test 1 Passed!\n");
  }

  // TEST 2: TV Show (Series & Episode) Resolution
  {
    console.log("Test 2: TV Show series and episode resolution...");
    const mockFetch = async (url, options = {}) => {
      const urlStr = String(url);

      if (urlStr.includes("AnyProviderIdEquals=") && urlStr.includes("1399")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            Items: [{ Id: "series_item_1399", Name: "Game of Thrones" }]
          })
        };
      }

      // Episodes endpoint
      if (urlStr.includes("/Shows/series_item_1399/Episodes")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            Items: [
              { Id: "ep_1", IndexNumber: 1, ParentIndexNumber: 1, Name: "Winter Is Coming" },
              { Id: "ep_2", IndexNumber: 2, ParentIndexNumber: 1, Name: "The Kingsroad" }
            ]
          })
        };
      }

      // PlaybackInfo endpoint for Episode 2
      if (urlStr.includes("/Items/ep_2/PlaybackInfo")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            MediaSources: [
              {
                Id: "source_4k",
                Bitrate: 35000000,
                MediaStreams: [
                  {
                    Type: "Video",
                    Codec: "hevc",
                    Width: 3840,
                    Height: 2160,
                    VideoRange: "HDR"
                  },
                  {
                    Type: "Audio",
                    Codec: "eac3",
                    ChannelLayout: "7.1",
                    Channels: 8
                  }
                ]
              }
            ]
          })
        };
      }

      throw new Error(`Unhandled mock URL: ${urlStr}`);
    };

    const provider = loadProvider(mockFetch);
    const streams = await provider.getStreams("1399", "tv", 1, 2);

    assert.strictEqual(streams.length, 1, "Should return 1 stream for S01E02");
    const s = streams[0];
    assert.strictEqual(s.quality, "4K", "Quality should be 4K");
    assert(s.name.includes("Emby"), "Name should identify as Emby");
    assert(s.description.includes("4K"), "Description should include 4K");
    assert(s.title.includes("HEVC") && s.title.includes("HDR"), "Title should include HEVC and HDR");
    assert.strictEqual(
      s.url,
      `${mockServerUrl}/emby/Videos/ep_2/stream.mp4?static=true&MediaSourceId=source_4k&api_key=${mockApiKey}`
    );
    console.log("✓ Test 2 Passed!\n");
  }

  // TEST 3: Fallback from IMDb to TMDB or vice versa
  {
    console.log("Test 3: IMDb ID format handling and search fallback...");
    const mockFetch = async (url, options = {}) => {
      const urlStr = String(url);

      // IMDb first attempt fails (empty)
      if (urlStr.includes("AnyProviderIdEquals=imdb.tt0137523")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ Items: [] })
        };
      }

      // TMDB fallback succeeds
      if (urlStr.includes("AnyProviderIdEquals=tmdb.tt0137523")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            Items: [{ Id: "movie_fallback_id" }]
          })
        };
      }

      if (urlStr.includes("/Items/movie_fallback_id/PlaybackInfo")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            MediaSources: [
              {
                Id: "src_fallback",
                MediaStreams: [
                  { Type: "Video", Codec: "h264", Height: 720, Width: 1280 },
                  { Type: "Audio", Codec: "aac", Channels: 2 }
                ]
              }
            ]
          })
        };
      }

      throw new Error(`Unhandled mock URL: ${urlStr}`);
    };

    const provider = loadProvider(mockFetch);
    const streams = await provider.getStreams("tt0137523", "movie");

    assert.strictEqual(streams.length, 1);
    assert.strictEqual(streams[0].quality, "720p");
    assert(streams[0].name.includes("Emby"));
    assert(streams[0].description.includes("720p"));
    assert(streams[0].title.includes("H.264") || streams[0].title.includes("AVC"));
    console.log("✓ Test 3 Passed!\n");
  }

  // TEST 4: Error Handling (Network error, HTTP error, Not found)
  {
    console.log("Test 4: Error handling and resilient behavior...");

    // Network crash simulation (Standard mode: returns [] to prevent unplayable stream)
    const crashingFetch = async () => {
      throw new Error("Connection refused (ECONNREFUSED)");
    };
    const provider1 = loadProvider(crashingFetch);
    const streams1 = await provider1.getStreams(550, "movie");
    assert.strictEqual(streams1.length, 0, "Must return empty array on network failure in standard mode");

    // Network crash with debugMode: true (returns diagnostic card)
    global.SCRAPER_SETTINGS = { debugMode: true };
    const provider1Debug = loadProvider(crashingFetch);
    const streams1Debug = await provider1Debug.getStreams(550, "movie");
    assert.strictEqual(streams1Debug.length, 1, "Must return diagnostic stream when debugMode is enabled");
    assert(streams1Debug[0].name.includes("Emby"), "Diagnostic stream must identify as Emby");
    delete global.SCRAPER_SETTINGS;

    // 404 / 401 response simulation
    const httpErrorFetch = async () => {
      return { ok: false, status: 401 };
    };
    const provider2 = loadProvider(httpErrorFetch);
    const streams2 = await provider2.getStreams(550, "movie");
    assert.strictEqual(streams2.length, 0, "Must return empty array on HTTP error in standard mode");

    // No media found
    const emptyFetch = async () => {
      return { ok: true, status: 200, json: async () => ({ Items: [] }) };
    };
    const provider3 = loadProvider(emptyFetch);
    const streams3 = await provider3.getStreams(999999, "movie");
    assert.strictEqual(streams3.length, 0, "Must return empty array when item is not found in standard mode");

    console.log("✓ Test 4 Passed!\n");
  }

  // TEST 5: Subtitle filtering (Internal image-based subs should be ignored, internal web/srt and external included)
  {
    console.log("Test 5: Subtitle filtering & language normalization...");
    const mockFetch = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("/Items?AnyProviderIdEquals=")) {
        return { ok: true, status: 200, json: async () => ({ Items: [{ Id: "item_sub_test" }] }) };
      }
      if (urlStr.includes("/PlaybackInfo")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            MediaSources: [
              {
                Id: "src_sub",
                MediaStreams: [
                  { Type: "Video", Codec: "hevc", Height: 1080, Width: 1920 },
                  { Type: "Audio", Codec: "aac", Channels: 2 },
                  // Case 1: Internal PGS subtitle (should be skipped)
                  { Type: "Subtitle", Index: 2, Codec: "pgs", IsExternal: false, Language: "eng" },
                  // Case 2: Internal SRT/SubRip subtitle (should be included because web format)
                  { Type: "Subtitle", Index: 3, Codec: "subrip", IsExternal: false, Language: "fre", DisplayTitle: "French Sub" },
                  // Case 3: External PGS subtitle (should be included because IsExternal is true)
                  { Type: "Subtitle", Index: 4, Codec: "pgs", IsExternal: true, Language: "ger", DisplayTitle: "German Sub" },
                  // Case 4: External VTT subtitle
                  { Type: "Subtitle", Index: 5, Codec: "vtt", IsExternal: true, Language: "tur", DisplayTitle: "Turkish Sub" }
                ]
              }
            ]
          })
        };
      }
      throw new Error(`Unexpected URL: ${urlStr}`);
    };

    const provider = loadProvider(mockFetch);
    const streams = await provider.getStreams(100, "movie");
    assert.strictEqual(streams[0].subtitles.length, 3, "Internal PGS should be excluded, leaving 3 subtitles");
    assert.strictEqual(streams[0].subtitles[0].lang, "fr", "fre should map to fr");
    assert.strictEqual(streams[0].subtitles[1].lang, "de", "ger should map to de");
    assert.strictEqual(streams[0].subtitles[2].lang, "tr", "tur should map to tr");
    console.log("✓ Test 5 Passed!\n");
  }

  // TEST 6: Media type variations ("series" vs "tv")
  {
    console.log("Test 6: Media type 'series' recognition...");
    let episodeChecked = false;
    const mockFetch = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("AnyProviderIdEquals=") && urlStr.includes("200")) {
        return { ok: true, status: 200, json: async () => ({ Items: [{ Id: "series_200" }] }) };
      }
      if (urlStr.includes("/Shows/series_200/Episodes")) {
        episodeChecked = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            Items: [{ Id: "ep_200_1", IndexNumber: 5, ParentIndexNumber: 2 }]
          })
        };
      }
      if (urlStr.includes("/PlaybackInfo")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            MediaSources: [
              {
                Id: "src_200",
                MediaStreams: [
                  { Type: "Video", Codec: "vp9", Height: 1440, Width: 2560 },
                  { Type: "Audio", Codec: "opus", Channels: 2 }
                ]
              }
            ]
          })
        };
      }
      throw new Error(`Unexpected URL: ${urlStr}`);
    };

    const provider = loadProvider(mockFetch);
    const streams = await provider.getStreams("200", "series", 2, 5);
    assert.strictEqual(episodeChecked, true, "Should query episodes for 'series' media type");
    assert.strictEqual(streams.length, 1);
    assert.strictEqual(streams[0].quality, "1440p");
    assert(streams[0].name.includes("Emby"));
    assert(streams[0].description.includes("1440p"));
    assert(streams[0].title.includes("VP9"));
    console.log("✓ Test 6 Passed!\n");
  }

  // TEST 7: Dynamic settings via globalThis.SCRAPER_SETTINGS & onSettings schema
  {
    console.log("Test 7: Dynamic settings (SCRAPER_SETTINGS) and onSettings()...");
    const mockFetch = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("dynamic-emby.example.com")) {
        if (urlStr.includes("/Items?AnyProviderIdEquals=")) {
          return { ok: true, status: 200, json: async () => ({ Items: [{ Id: "item_dyn" }] }) };
        }
        if (urlStr.includes("/PlaybackInfo")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              MediaSources: [{ Id: "src_dyn", MediaStreams: [{ Type: "Video", Height: 1080, Width: 1920 }] }]
            })
          };
        }
      }
      throw new Error(`Unexpected URL: ${urlStr}`);
    };

    // Simulate Nuvio environment with globalThis.SCRAPER_SETTINGS
    global.SCRAPER_SETTINGS = {
      serverUrl: "https://dynamic-emby.example.com",
      apiKey: "dynamic_api_token",
      userId: "dynamic_user_id"
    };

    const provider = loadProvider(mockFetch);

    // Verify onSettings schema
    assert(typeof provider.onSettings === "function", "provider.onSettings must be exported");
    const settingsSchema = await provider.onSettings();
    assert.strictEqual(settingsSchema.length, 5, "Should define 5 settings schema elements (1 header + 4 inputs)");
    assert.strictEqual(settingsSchema[0].type, "header");
    assert.strictEqual(settingsSchema[1].key, "serverUrl");
    assert.strictEqual(settingsSchema[2].key, "username");
    assert.strictEqual(settingsSchema[3].key, "password");
    assert.strictEqual(settingsSchema[4].key, "debugMode");

    // Verify getStreams uses dynamic settings
    const streams = await provider.getStreams(550, "movie");
    assert.strictEqual(streams.length, 1);
    assert(streams[0].url.startsWith("https://dynamic-emby.example.com"), "URL must use dynamic serverUrl");
    assert.strictEqual(streams[0].headers["X-Emby-Token"], "dynamic_api_token", "Header must use dynamic apiKey");

    delete global.SCRAPER_SETTINGS;
    console.log("✓ Test 7 Passed!\n");
  }

  // TEST 8: Username & Password Authentication Flow
  {
    console.log("Test 8: Username & Password authentication flow...");
    let authCalled = false;

    const mockFetch = async (url, options = {}) => {
      const urlStr = String(url);

      // AuthenticateByName endpoint
      if (urlStr.includes("/Users/AuthenticateByName")) {
        authCalled = true;
        const body = JSON.parse(options.body);
        assert.strictEqual(body.Username, "oguz");
        assert.strictEqual(body.Pw, "secret_password");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            AccessToken: "authed_token_xyz",
            User: { Id: "authed_user_789" }
          })
        };
      }

      // Search endpoint using acquired token and userId
      if (urlStr.includes("/Users/authed_user_789/Items?AnyProviderIdEquals=")) {
        assert(urlStr.includes("api_key=authed_token_xyz"));
        return {
          ok: true,
          status: 200,
          json: async () => ({ Items: [{ Id: "movie_auth_success" }] })
        };
      }

      // PlaybackInfo
      if (urlStr.includes("/Items/movie_auth_success/PlaybackInfo")) {
        assert(urlStr.includes("api_key=authed_token_xyz"));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            MediaSources: [{ Id: "src_auth", MediaStreams: [{ Type: "Video", Height: 1080, Width: 1920 }] }]
          })
        };
      }

      throw new Error(`Unexpected URL in Test 8: ${urlStr}`);
    };

    global.SCRAPER_SETTINGS = {
      serverUrl: "http://localhost:8096",
      username: "oguz",
      password: "secret_password",
      apiKey: "",
      userId: ""
    };

    const provider = loadProvider(mockFetch);
    const streams = await provider.getStreams(550, "movie");

    assert.strictEqual(authCalled, true, "Must call AuthenticateByName with username and password");
    assert.strictEqual(streams.length, 1);
    assert.strictEqual(streams[0].headers["X-Emby-Token"], "authed_token_xyz");
    assert(streams[0].url.includes("api_key=authed_token_xyz"));

    delete global.SCRAPER_SETTINGS;
    console.log("✓ Test 8 Passed!\n");
  }

  // TEST 9: Colon Separated Stremio IDs (tt0903747:1:1 and tmdb:1396:1:2)
  {
    console.log("Test 9: Colon separated Stremio IDs handling...");
    const mockFetch = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("AnyProviderIdEquals=imdb.tt0903747")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ Items: [{ Id: "series_stremio_id", Name: "Breaking Bad" }] })
        };
      }
      if (urlStr.includes("/Shows/series_stremio_id/Episodes")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            Items: [{ Id: "ep_stremio", IndexNumber: 1, ParentIndexNumber: 1, Name: "Pilot" }]
          })
        };
      }
      if (urlStr.includes("/PlaybackInfo") || urlStr.includes("/Items/ep_stremio")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            MediaSources: [{ Id: "src_stremio", MediaStreams: [{ Type: "Video", Height: 1080 }] }]
          })
        };
      }
      throw new Error(`Unexpected URL in Test 9: ${urlStr}`);
    };

    global.SCRAPER_SETTINGS = {
      serverUrl: "http://localhost:8096",
      apiKey: "test_key",
      userId: "user_test"
    };

    const provider = loadProvider(mockFetch);
    const streams = await provider.getStreams("tt0903747:1:1", "tv");
    assert.strictEqual(streams.length, 1);
    assert.strictEqual(streams[0].quality, "1080p");

    delete global.SCRAPER_SETTINGS;
    console.log("✓ Test 9 Passed!\n");
  }

  // TEST 10: Debug Mode Card Output
  {
    console.log("Test 10: Debug mode card output...");
    const mockFetch = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("AnyProviderIdEquals=tmdb.550")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ Items: [{ Id: "movie_debug", Name: "Fight Club" }] })
        };
      }
      if (urlStr.includes("/PlaybackInfo") || urlStr.includes("/Items/movie_debug")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            MediaSources: [{ Id: "src_debug", MediaStreams: [{ Type: "Video", Height: 1080 }] }]
          })
        };
      }
      throw new Error(`Unexpected URL in Test 10: ${urlStr}`);
    };

    global.SCRAPER_SETTINGS = {
      serverUrl: "http://localhost:8096",
      apiKey: "test_key",
      userId: "user_test",
      debugMode: true
    };

    const provider = loadProvider(mockFetch);
    const streams = await provider.getStreams(550, "movie");
    assert.strictEqual(streams.length, 2, "Should return 1 debug card + 1 stream");
    assert.strictEqual(streams[0].quality, "TEŞHİS");
    assert(streams[0].name.includes("Teşhis"));

    delete global.SCRAPER_SETTINGS;
    console.log("✓ Test 10 Passed!\n");
  }

  // TEST 11: Sorting - Quality First (4K > 1440p > 1080p > 720p), then Size Descending
  {
    console.log("Test 11: Sorting (Quality first, then Size descending)...");
    const mockFetch = async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("AnyProviderIdEquals=")) {
        return { ok: true, status: 200, json: async () => ({ Items: [{ Id: "multi_source_item" }] }) };
      }
      if (urlStr.includes("/PlaybackInfo") || urlStr.includes("/Items/multi_source_item")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            MediaSources: [
              { Id: "src_1080p_large", Size: 25 * 1024 * 1024 * 1024, MediaStreams: [{ Type: "Video", Height: 1080, Width: 1920 }] },
              { Id: "src_4k_small", Size: 8 * 1024 * 1024 * 1024, MediaStreams: [{ Type: "Video", Height: 2160, Width: 3840 }] },
              { Id: "src_4k_large", Size: 60 * 1024 * 1024 * 1024, MediaStreams: [{ Type: "Video", Height: 2160, Width: 3840 }] },
              { Id: "src_720p", Size: 2 * 1024 * 1024 * 1024, MediaStreams: [{ Type: "Video", Height: 720, Width: 1280 }] },
              { Id: "src_1080p_small", Size: 3 * 1024 * 1024 * 1024, MediaStreams: [{ Type: "Video", Height: 1080, Width: 1920 }] }
            ]
          })
        };
      }
      throw new Error(`Unexpected URL in Test 11: ${urlStr}`);
    };

    const provider = loadProvider(mockFetch);
    const streams = await provider.getStreams(100, "movie");

    assert.strictEqual(streams.length, 5, "Should return 5 streams");
    // Expected order:
    // 1. 4K Large (60 GB)
    // 2. 4K Small (8 GB)
    // 3. 1080p Large (25 GB)
    // 4. 1080p Small (3 GB)
    // 5. 720p (2 GB)
    assert.strictEqual(streams[0].quality, "4K", "1st stream should be 4K");
    assert(streams[0].url.includes("src_4k_large"), "1st stream should be 4K Large");
    assert.strictEqual(streams[1].quality, "4K", "2nd stream should be 4K");
    assert(streams[1].url.includes("src_4k_small"), "2nd stream should be 4K Small");
    assert.strictEqual(streams[2].quality, "1080p", "3rd stream should be 1080p");
    assert(streams[2].url.includes("src_1080p_large"), "3rd stream should be 1080p Large");
    assert.strictEqual(streams[3].quality, "1080p", "4th stream should be 1080p");
    assert(streams[3].url.includes("src_1080p_small"), "4th stream should be 1080p Small");
    assert.strictEqual(streams[4].quality, "720p", "5th stream should be 720p");
    assert(streams[4].url.includes("src_720p"), "5th stream should be 720p");
    console.log("✓ Test 11 Passed!\n");
  }

  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
