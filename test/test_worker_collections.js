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

    // /Users/.../Items/lib_movies_4
    if (urlStr.includes("/Users/test_user_id_456/Items/lib_movies_4") && !urlStr.includes("ParentId=")) {
      return new Response(JSON.stringify({ Id: "lib_movies_4", Name: "Filmler", Overview: "Film koleksiyonu" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // /Users/.../Items?ParentId=lib_movies_4
    if (urlStr.includes("ParentId=lib_movies_4")) {
      return new Response(JSON.stringify({
        Items: [
          { Id: "item_m1", Name: "Inception", ProductionYear: 2010, Overview: "A thief steals secrets through dreams." },
          { Id: "item_m2", Name: "Interstellar", ProductionYear: 2014, Overview: "Explorers travel through a wormhole." }
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
    // 1. Test GET /:config/collections.json
    console.log("Test 1: GET /:config/collections.json returns Nuvio collections schema...");
    const colRes = await worker.fetch(new Request(`https://worker.local/${token}/collections.json`));
    assert.strictEqual(colRes.status, 200, "collections.json should return HTTP 200");
    const collections = await colRes.json();
    assert(Array.isArray(collections), "Collections should be an array");
    assert.strictEqual(collections.length, 1, "Should have 1 top collection");
    assert.strictEqual(collections[0].title, "Benim Medyam");
    assert.strictEqual(collections[0].id, "collection-benim-medyam");

    const folders = collections[0].folders;
    assert.strictEqual(folders.length, 4, "Should have 4 folders (Filmler, Diziler, Koleksiyonlar, Oynatma Listeleri)");

    const movieFolder = folders.find(f => f.title === "Filmler");
    assert(movieFolder, "Filmler folder must exist");
    assert.strictEqual(movieFolder.tileShape, "LANDSCAPE");
    assert(movieFolder.coverImageUrl.includes("/Items/lib_movies_4/Images/Primary"));
    assert.strictEqual(movieFolder.catalogSources.length, 4);
    assert.strictEqual(movieFolder.catalogSources[0].catalogId, "emby_lib_lib_movies_4_resume");
    assert.strictEqual(movieFolder.catalogSources[2].catalogId, "emby_lib_lib_movies_4_all");

    const tvFolder = folders.find(f => f.title === "Diziler");
    assert(tvFolder, "Diziler folder must exist");
    assert.strictEqual(tvFolder.tileShape, "LANDSCAPE");
    assert.strictEqual(tvFolder.catalogSources[2].type, "series");

    const boxsetFolder = folders.find(f => f.title === "Koleksiyonlar");
    assert(boxsetFolder, "Koleksiyonlar folder must exist");
    assert.strictEqual(boxsetFolder.catalogSources[0].catalogId, "emby_lib_lib_boxsets_212833_boxsets");

    console.log("✓ Test 1 Passed!\n");

    // 2. Test GET /:config/manifest.json includes emby_my_media catalog
    console.log("Test 2: GET /:config/manifest.json includes '📁 Benim Medyam' catalog...");
    const manifestRes = await worker.fetch(new Request(`https://worker.local/${token}/manifest.json`));
    assert.strictEqual(manifestRes.status, 200);
    const manifest = await manifestRes.json();
    const myMediaCat = manifest.catalogs.find(c => c.id === "emby_my_media");
    assert(myMediaCat, "Manifest must contain emby_my_media catalog");
    assert.strictEqual(myMediaCat.name, "📁 Benim Medyam");
    console.log("✓ Test 2 Passed!\n");

    // 3. Test GET /:config/catalog/movie/emby_my_media.json returns library cards
    console.log("Test 3: GET /:config/catalog/movie/emby_my_media.json returns landscape library cards...");
    const catRes = await worker.fetch(new Request(`https://worker.local/${token}/catalog/movie/emby_my_media.json`));
    assert.strictEqual(catRes.status, 200);
    const catData = await catRes.json();
    assert(catData && Array.isArray(catData.metas), "Catalog data must contain metas array");
    assert.strictEqual(catData.metas.length, 4);
    assert.strictEqual(catData.metas[0].id, "emby:library:lib_movies_4");
    assert.strictEqual(catData.metas[0].posterShape, "landscape");
    assert.strictEqual(catData.metas[0].name, "Filmler");
    assert.strictEqual(catData.metas[1].id, "emby:library:lib_series_515302");
    assert.strictEqual(catData.metas[1].posterShape, "landscape");
    assert.strictEqual(catData.metas[1].name, "Diziler");
    console.log("✓ Test 3 Passed!\n");

    // 4. Test GET /:config/meta/series/emby:library:lib_movies_4.json
    console.log("Test 4: GET /:config/meta/series/emby:library:lib_movies_4.json returns items inside library...");
    const metaRes = await worker.fetch(new Request(`https://worker.local/${token}/meta/series/emby:library:lib_movies_4.json`));
    assert.strictEqual(metaRes.status, 200);
    const metaData = await metaRes.json();
    assert(metaData && metaData.meta, "Meta response must contain meta object");
    assert.strictEqual(metaData.meta.name, "Filmler");
    assert.strictEqual(metaData.meta.posterShape, "landscape");
    assert(Array.isArray(metaData.meta.videos), "Meta must have videos list");
    assert.strictEqual(metaData.meta.videos.length, 2);
    assert.strictEqual(metaData.meta.videos[0].id, "emby:item:item_m1");
    assert.strictEqual(metaData.meta.videos[0].title, "Inception (2010)");
    console.log("✓ Test 4 Passed!\n");

    console.log("🎉 ALL WORKER COLLECTIONS TESTS PASSED SUCCESSFULLY!\n");
  } finally {
    global.fetch = originalFetch;
  }
}

runWorkerTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
