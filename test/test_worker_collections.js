/**
 * Automated test suite for Cloudflare Worker Nuvio Collections & Library support
 */
const assert = require("assert");

async function runWorkerTests() {
  console.log("=== Running Cloudflare Worker Collections Tests ===\n");

  const worker = (await import("../cloudflare-worker/worker.js")).default;
  assert(worker && typeof worker.fetch === "function", "Worker must export a fetch handler");

  const mockConfig = {
    serverUrl: "http://localhost:8096",
    apiKey: "test_api_key_123",
    userId: "test_user_id_456"
  };

  // Base64URL encode config
  const token = Buffer.from(JSON.stringify(mockConfig)).toString("base64url");

  // Mock global fetch to handle Emby calls from worker
  const originalFetch = global.fetch;
  global.fetch = async (url, opts = {}) => {
    const urlStr = String(url);

    // /System/Info/Public
    if (urlStr.includes("/System/Info/Public")) {
      return new Response(JSON.stringify({ ServerName: "Mock Emby Server", Version: "4.8.0.0" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // /Users/.../Views (Emby Libraries)
    if (urlStr.includes("/Views")) {
      return new Response(JSON.stringify({
        Items: [
          { Id: "lib_movies_4", Name: "Filmler", CollectionType: "movies" },
          { Id: "lib_series_515302", Name: "Diziler", CollectionType: "tvshows" },
          { Id: "lib_boxsets_212833", Name: "Koleksiyonlar", CollectionType: "boxsets" },
          { Id: "lib_playlists_999", Name: "Oynatma Listeleri", CollectionType: "playlists" }
        ]
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // /Users/.../Items?ParentId=lib_boxsets_212833 (BoxSets list)
    if (urlStr.includes("ParentId=lib_boxsets_212833")) {
      return new Response(JSON.stringify({
        Items: [
          { Id: "box_baba", Name: "Baba [Seri]", Type: "BoxSet" },
          { Id: "box_matrix", Name: "Matrix [Seri]", Type: "BoxSet" }
        ]
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // /Users/.../Items?ParentId=box_baba (Movies inside Baba boxset)
    if (urlStr.includes("ParentId=box_baba")) {
      return new Response(JSON.stringify({
        Items: [
          { Id: "m_baba1", Name: "Baba", ProductionYear: 1972, Overview: "Don Corleone'nin hikayesi.", Type: "Movie" },
          { Id: "m_baba2", Name: "Baba 2", ProductionYear: 1974, Overview: "Michael Corleone'nin yükselişi.", Type: "Movie" }
        ]
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // /Users/.../Items/box_baba (BoxSet metadata)
    if (urlStr.includes("/Items/box_baba") && !urlStr.includes("PlaybackInfo") && !urlStr.includes("ParentId=")) {
      return new Response(JSON.stringify({
        Id: "box_baba",
        Name: "Baba [Seri]",
        Type: "BoxSet",
        Overview: "Baba film üçlemesi."
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // PlaybackInfo for m_baba1
    if (urlStr.includes("/Items/m_baba1/PlaybackInfo")) {
      return new Response(JSON.stringify({
        MediaSources: [
          { Id: "src_baba1", Container: "mkv", Bitrate: 15000000, MediaStreams: [{ Type: "Video", Height: 1080 }] }
        ]
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // PlaybackInfo for m_baba2
    if (urlStr.includes("/Items/m_baba2/PlaybackInfo")) {
      return new Response(JSON.stringify({
        MediaSources: [
          { Id: "src_baba2", Container: "mkv", Bitrate: 18000000, MediaStreams: [{ Type: "Video", Height: 1080 }] }
        ]
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Fallback for other calls
    return new Response(JSON.stringify({ Items: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    // 1. Test GET /:config/collections.json returns Nuvio native collections schema
    console.log("Test 1: GET /:config/collections.json returns Nuvio native collections and franchise folders...");
    const colRes = await worker.fetch(new Request(`https://worker.local/${token}/collections.json`));
    assert.strictEqual(colRes.status, 200, "collections.json should return HTTP 200");
    const collections = await colRes.json();
    assert(Array.isArray(collections), "Collections should be an array");
    assert.strictEqual(collections.length, 2, "Should return 2 collections: Benim Medyam and Film Koleksiyonları");
    
    // Check Collection 1: Benim Medyam
    const benimMedyam = collections[0];
    assert.strictEqual(benimMedyam.title, "Benim Medyam");
    assert.strictEqual(benimMedyam.folders.length, 4);

    const boxsetFolder = benimMedyam.folders.find(f => f.title === "Koleksiyonlar");
    assert(boxsetFolder, "Koleksiyonlar folder must exist in Benim Medyam");
    assert.strictEqual(boxsetFolder.catalogSources[0].type, "movie", "Koleksiyonlar folder must have type: 'movie' NOT 'series'!");

    // Check Collection 2: Film Koleksiyonları (Seriler)
    const filmKoleksiyonlari = collections[1];
    assert.strictEqual(filmKoleksiyonlari.title, "Film Koleksiyonları (Seriler)");
    assert.strictEqual(filmKoleksiyonlari.folders.length, 2, "Should have 2 franchise folders (Baba and Matrix)");
    
    const babaFolder = filmKoleksiyonlari.folders.find(f => f.title === "Baba [Seri]");
    assert(babaFolder, "Baba franchise folder must exist");
    assert.strictEqual(babaFolder.tileShape, "POSTER");
    assert.strictEqual(babaFolder.catalogSources[0].type, "movie", "Franchise folder catalogSource must have type: 'movie' NOT 'series'!");
    assert.strictEqual(babaFolder.catalogSources[0].catalogId, "emby_boxset_box_baba");

    console.log("✓ Test 1 Passed!\n");

    // 2. Test GET /:config/manifest.json has BoxSets as movie type and no fake series library catalog
    console.log("Test 2: GET /:config/manifest.json sets BoxSets to 'movie' and omits fake series catalog...");
    const manifestRes = await worker.fetch(new Request(`https://worker.local/${token}/manifest.json`));
    assert.strictEqual(manifestRes.status, 200);
    const manifest = await manifestRes.json();

    const boxsetCat = manifest.catalogs.find(c => c.id.includes("_boxsets") || c.id === "emby_boxsets");
    assert(boxsetCat, "BoxSets catalog must exist in manifest");
    assert.strictEqual(boxsetCat.type, "movie", "BoxSets catalog MUST have type: 'movie' so it is not perceived as a TV series!");

    const fakeMediaCat = manifest.catalogs.find(c => c.id === "emby_my_media");
    assert(!fakeMediaCat, "Fake emby_my_media catalog should be removed to prevent fake TV series display");

    console.log("✓ Test 2 Passed!\n");

    // 3. Test GET /:config/catalog/movie/emby_boxset_box_baba.json returns individual movie cards
    console.log("Test 3: GET /:config/catalog/movie/emby_boxset_box_baba.json returns movies with type 'movie'...");
    const boxCatRes = await worker.fetch(new Request(`https://worker.local/${token}/catalog/movie/emby_boxset_box_baba.json`));
    assert.strictEqual(boxCatRes.status, 200);
    const boxCatData = await boxCatRes.json();
    assert(boxCatData && Array.isArray(boxCatData.metas), "BoxSet catalog response must have metas array");
    assert.strictEqual(boxCatData.metas.length, 2);
    assert.strictEqual(boxCatData.metas[0].type, "movie", "Child movie must have type: 'movie'!");
    assert.strictEqual(boxCatData.metas[0].name, "Baba");
    assert.strictEqual(boxCatData.metas[1].name, "Baba 2");
    console.log("✓ Test 3 Passed!\n");

    // 4. Test GET /:config/meta/movie/emby:boxset:box_baba.json returns movie metadata with no fake episodes
    console.log("Test 4: GET /:config/meta/movie/emby:boxset:box_baba.json returns movie metadata...");
    const metaRes = await worker.fetch(new Request(`https://worker.local/${token}/meta/movie/emby:boxset:box_baba.json`));
    assert.strictEqual(metaRes.status, 200);
    const metaData = await metaRes.json();
    assert(metaData && metaData.meta, "Meta response must contain meta");
    assert.strictEqual(metaData.meta.type, "movie", "BoxSet meta MUST have type: 'movie'!");
    assert(!metaData.meta.videos, "BoxSet must NOT have videos array (not a series with episodes)");
    assert(metaData.meta.description.includes("Baba (1972)"), "Description should list movies in collection");
    console.log("✓ Test 4 Passed!\n");

    // 5. Test GET /:config/stream/movie/emby:boxset:box_baba.json returns playable movie streams
    console.log("Test 5: GET /:config/stream/movie/emby:boxset:box_baba.json returns movie stream selections...");
    const streamRes = await worker.fetch(new Request(`https://worker.local/${token}/stream/movie/emby:boxset:box_baba.json`));
    assert.strictEqual(streamRes.status, 200);
    const streamData = await streamRes.json();
    assert(streamData && Array.isArray(streamData.streams), "Stream response must have streams array");
    assert.strictEqual(streamData.streams.length, 2);
    assert(streamData.streams[0].title.includes("Baba (1972)"));
    assert(streamData.streams[1].title.includes("Baba 2 (1974)"));
    console.log("✓ Test 5 Passed!\n");

    console.log("🎉 ALL WORKER COLLECTIONS TESTS PASSED SUCCESSFULLY!\n");
  } finally {
    global.fetch = originalFetch;
  }
}

runWorkerTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
