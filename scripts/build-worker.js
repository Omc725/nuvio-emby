const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const EMBY_JS_PATH = path.join(ROOT_DIR, 'emby.js');
const MANIFEST_PATH = path.join(ROOT_DIR, 'manifest.json');
const WORKER_DIR = path.join(ROOT_DIR, 'cloudflare-worker');
const WORKER_OUTPUT_PATH = path.join(WORKER_DIR, 'worker.js');

if (!fs.existsSync(EMBY_JS_PATH)) {
  console.error('Hata: emby.js bulunamadı! Lütfen önce "npm run build:plugin" çalıştırın.');
  process.exit(1);
}

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error('Hata: manifest.json bulunamadı!');
  process.exit(1);
}

if (!fs.existsSync(WORKER_DIR)) {
  fs.mkdirSync(WORKER_DIR, { recursive: true });
}

const embyJsContent = fs.readFileSync(EMBY_JS_PATH, 'utf8');
const scraperManifestContent = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

// Unified Manifest: Supports BOTH Stremio Addon (for rich multi-line card + BOYUT badge) AND Local Scraper
const UNIFIED_MANIFEST = {
  id: "org.omc725.nuvioemby",
  name: "Emby / Jellyfin",
  version: "3.5.0",
  description: "Nuvio & Stremio doğrudan oynatma (Direct Play) eklentisi (Emby & Jellyfin)",
  logo: "https://emby.media/images/embyicon.png",
  resources: ["stream"],
  types: ["movie", "series", "tv"],
  idPrefixes: ["tt", "tmdb:"],
  catalogs: [],
  behaviorHints: {
    configurable: false,
    configurationRequired: false
  },
  scrapers: scraperManifestContent.scrapers || []
};

// HTML Configurator Template
const HTML_CONFIGURATOR = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuvio Emby & Jellyfin - Kişisel Eklenti Yapılandırıcı</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(18, 24, 38, 0.85);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent-emby: #52B54B;
      --accent-emby-hover: #439b3d;
      --accent-nuvio: #6366f1;
      --accent-gradient: linear-gradient(135deg, #52B54B 0%, #10b981 50%, #6366f1 100%);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --input-bg: rgba(10, 15, 26, 0.7);
      --input-border: rgba(255, 255, 255, 0.12);
      --input-focus: #52B54B;
      --error: #ef4444;
      --success: #10b981;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(at 0% 0%, rgba(82, 181, 75, 0.12) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(99, 102, 241, 0.12) 0px, transparent 50%);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      line-height: 1.6;
    }

    .container { width: 100%; max-width: 640px; }
    .header { text-align: center; margin-bottom: 2rem; }

    .badge-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--card-border);
      border-radius: 9999px;
      padding: 0.35rem 0.85rem;
      font-size: 0.825rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-emby);
      box-shadow: 0 0 10px var(--accent-emby);
    }

    h1 {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle { color: var(--text-muted); font-size: 0.95rem; }

    .card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 1.25rem;
      padding: 2rem;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
      margin-bottom: 1.5rem;
    }

    .form-group { margin-bottom: 1.25rem; }
    .form-group:last-child { margin-bottom: 0; }

    label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #e2e8f0;
    }

    .label-hint { font-size: 0.75rem; font-weight: 400; color: var(--text-muted); }

    .input-wrapper { position: relative; display: flex; align-items: center; }

    input[type="text"], input[type="password"] {
      width: 100%;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      font-size: 0.95rem;
      color: var(--text);
      font-family: inherit;
      transition: all 0.2s ease;
      outline: none;
    }

    input[type="text"]:focus, input[type="password"]:focus {
      border-color: var(--input-focus);
      box-shadow: 0 0 0 3px rgba(82, 181, 75, 0.15);
    }

    .toggle-pwd {
      position: absolute;
      right: 0.85rem;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      transition: color 0.2s;
    }

    .toggle-pwd:hover { color: var(--text); }

    .collapsible-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.5rem 0;
      cursor: pointer;
      margin-top: 0.5rem;
      transition: color 0.2s;
    }

    .collapsible-trigger:hover { color: var(--text); }

    .collapsible-content {
      display: none;
      padding-top: 1rem;
      border-top: 1px solid var(--card-border);
      margin-top: 0.5rem;
    }

    .collapsible-content.open { display: block; }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: #cbd5e1;
      user-select: none;
    }

    .checkbox-group input {
      accent-color: var(--accent-emby);
      width: 1.1rem;
      height: 1.1rem;
      cursor: pointer;
    }

    .btn-row {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    button.btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.85rem 1.25rem;
      border-radius: 0.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      font-family: inherit;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
      border: 1px solid var(--card-border) !important;
    }

    .btn-secondary:hover { background: rgba(255, 255, 255, 0.12); }

    .btn-primary {
      background: var(--accent-gradient);
      color: #ffffff;
      box-shadow: 0 4px 20px rgba(82, 181, 75, 0.25);
    }

    .btn-primary:hover {
      opacity: 0.95;
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(82, 181, 75, 0.35);
    }

    .status-box {
      display: none;
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      align-items: center;
      gap: 0.6rem;
    }

    .status-box.show { display: flex; }

    .status-box.success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .status-box.error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }

    .status-box.info {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818cf8;
    }

    .result-card { display: none; animation: fadeIn 0.3s ease; }
    .result-card.show { display: block; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .url-box {
      display: flex;
      align-items: center;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 0.75rem;
      padding: 0.35rem 0.35rem 0.35rem 0.85rem;
      margin: 1rem 0;
    }

    .url-text {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.825rem;
      color: #38bdf8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding-right: 0.5rem;
    }

    .copy-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 0.5rem 0.85rem;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.2s;
    }

    .copy-btn:hover { background: rgba(255, 255, 255, 0.15); }

    .qr-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      background: rgba(0, 0, 0, 0.25);
      border-radius: 0.85rem;
      margin: 1.25rem 0;
    }

    #qrcode {
      background: white;
      padding: 10px;
      border-radius: 8px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    #qrcode img { display: block; }

    .steps-list {
      margin-top: 1.25rem;
      padding-left: 1.2rem;
      color: #cbd5e1;
      font-size: 0.875rem;
    }

    .steps-list li { margin-bottom: 0.65rem; }
    .steps-list li strong { color: #ffffff; }

    .footer {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8rem;
      margin-top: 1rem;
    }

    .footer a { color: #cbd5e1; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>

  <div class="container">
    <div class="header">
      <div class="badge-row">
        <div class="badge">
          <span class="badge-dot"></span>
          Emby & Jellyfin v3.5.0
        </div>
        <div class="badge">
          Nuvio & Stremio Direct Play
        </div>
      </div>
      <h1>Nuvio Emby & Jellyfin Yapılandırıcı</h1>
      <p class="subtitle">Emby veya Jellyfin sunucunuzu bağlayın; Nuvio için zengin kart ve BOYUT rozeti destekli manifestinizi üretin.</p>
    </div>

    <!-- Yapılandırma Formu -->
    <div class="card">
      <form id="configForm" onsubmit="return false;">
        <div class="form-group">
          <label for="serverUrl">
            Emby / Jellyfin Sunucu Adresi
            <span class="label-hint">Örn: http://192.168.1.100:8096 veya https://jellyfin.alanadi.com</span>
          </label>
          <div class="input-wrapper">
            <input type="text" id="serverUrl" placeholder="http://192.168.1.100:8096 veya https://jellyfin.alanadi.com" required autocomplete="off">
          </div>
        </div>

        <div class="form-group">
          <label for="username">
            Kullanıcı Adı
            <span class="label-hint">Emby veya Jellyfin kullanıcı adınız</span>
          </label>
          <div class="input-wrapper">
            <input type="text" id="username" placeholder="Örn: Oguz" required autocomplete="username">
          </div>
        </div>

        <div class="form-group">
          <label for="password">
            Şifre
            <span class="label-hint">Şifresiz ise boş bırakın</span>
          </label>
          <div class="input-wrapper">
            <input type="password" id="password" placeholder="••••••••" autocomplete="current-password">
            <button type="button" class="toggle-pwd" id="togglePwd" title="Şifreyi Göster/Gizle">👁</button>
          </div>
        </div>

        <!-- Gelişmiş Ayarlar (Akordiyon) -->
        <button type="button" class="collapsible-trigger" id="advTrigger">
          <span>⚙️ Gelişmiş Seçenekler</span>
          <span id="advArrow">▼</span>
        </button>

        <div class="collapsible-content" id="advContent">
          <div class="form-group">
            <label class="checkbox-group">
              <input type="checkbox" id="debugMode">
              <span>Hata Ayıklama (Debug) Modu - Konsola ayrıntılı akış çözümleme logları bas</span>
            </label>
          </div>

          <div class="form-group">
            <label for="logEndpoint">
              Uzak Telemetri / ntfy.sh Log Uç Noktası
              <span class="label-hint">Opsiyonel</span>
            </label>
            <div class="input-wrapper">
              <input type="text" id="logEndpoint" placeholder="https://ntfy.sh/benim-emby-loglarim">
            </div>
          </div>
        </div>

        <div class="btn-row">
          <button type="button" class="btn btn-secondary" id="btnTest">
            <span id="testIcon">🔍</span>
            <span id="testText">Bağlantıyı Test Et</span>
          </button>
          <button type="button" class="btn btn-primary" id="btnGenerate">
            <span>⚡ Manifest URL'si Üret</span>
          </button>
        </div>

        <div class="status-box" id="statusBox"></div>
      </form>
    </div>

    <!-- Sonuç Bölümü -->
    <div class="card result-card" id="resultCard">
      <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; color: #10b981;">🎉 Manifest URL'niz Hazır!</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted);">Aşağıdaki bağlantı Emby sunucunuz ve kimlik bilgilerinizle yapılandırılmış kişisel manifest adresinizdir.</p>

      <div class="url-box">
        <span class="url-text" id="manifestUrlText"></span>
        <button type="button" class="copy-btn" id="btnCopy">
          <span id="copyIcon">📋</span>
          <span id="copyText">Kopyala</span>
        </button>
      </div>

      <div class="qr-section">
        <div id="qrcode"></div>
        <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.65rem;">Android TV veya telefon kamerasından kolayca taratabilirsiniz</span>
      </div>

      <h4 style="font-size: 0.95rem; font-weight: 700; margin-top: 1rem; color: #f1f5f9;">📲 Nuvio'ya Nasıl Eklenir? (Önemli)</h4>
      <ol class="steps-list">
        <li>Yukarıdaki URL'yi kopyalayın.</li>
        <li>Nuvio uygulamasını açın ve <strong>Ayarlar (Settings) > Eklentiler (Addons / Plugins) > Eklenti Ekle (Add Addon)</strong> bölümüne gidin.</li>
        <li>Kopyaladığınız manifest URL'sini yapıştırın ve <strong>Ekle</strong> butonuna basın.</li>
        <li><strong>Tebrikler!</strong> Artık akış listenizde <code>1080p • 1920x1080</code>, <code>HEVC 10bit</code>, <code>DD+ 2.0</code>, <code>MKV • 3.0Mbps</code> ve <strong>[BOYUT 412 MB]</strong> rozetiyle zengin detaylı kartlar görüntülenecektir!</li>
      </ol>
    </div>

    <div class="footer">
      <p>🔒 <strong>Sıfır Günlük & Güvenlik Garantisi:</strong> Kimlik bilgileriniz hiçbir sunucuda depolanmaz. Yapılandırma istemci tarafında URL-safe Base64 olarak kodlanır.</p>
    </div>
  </div>

  <script>
    // Şifre Göster/Gizle
    const togglePwd = document.getElementById('togglePwd');
    const pwdInput = document.getElementById('password');
    togglePwd.addEventListener('click', () => {
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        togglePwd.textContent = '🔒';
      } else {
        pwdInput.type = 'password';
        togglePwd.textContent = '👁';
      }
    });

    // Gelişmiş Ayarlar Aç/Kapa
    const advTrigger = document.getElementById('advTrigger');
    const advContent = document.getElementById('advContent');
    const advArrow = document.getElementById('advArrow');
    advTrigger.addEventListener('click', () => {
      advContent.classList.toggle('open');
      advArrow.textContent = advContent.classList.contains('open') ? '▲' : '▼';
    });

    // Durum Bildirimi Göster
    const statusBox = document.getElementById('statusBox');
    function showStatus(type, msg) {
      statusBox.className = 'status-box show ' + type;
      statusBox.innerHTML = msg;
    }

    // URL-safe Base64 Kodlama
    function encodeBase64Url(str) {
      const bytes = new TextEncoder().encode(str);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
    }

    // Form Değerlerini Topla
    function getFormData() {
      let serverUrl = document.getElementById('serverUrl').value.trim();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const debugMode = document.getElementById('debugMode').checked;
      const logEndpoint = document.getElementById('logEndpoint').value.trim();

      if (!serverUrl) {
        showStatus('error', '⚠️ Lütfen Emby sunucu adresinizi girin.');
        return null;
      }

      if (!username) {
        showStatus('error', '⚠️ Lütfen Emby kullanıcı adınızı girin.');
        return null;
      }

      serverUrl = serverUrl.replace(/\\/+$/, '');
      if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
        serverUrl = 'http://' + serverUrl;
      }

      return {
        serverUrl,
        username,
        password,
        debugMode,
        logEndpoint
      };
    }

    // Bağlantıyı Test Et
    const btnTest = document.getElementById('btnTest');
    const testIcon = document.getElementById('testIcon');
    const testText = document.getElementById('testText');

    btnTest.addEventListener('click', async () => {
      const data = getFormData();
      if (!data) return;

      testIcon.innerHTML = '<span class="spinner"></span>';
      testText.textContent = 'Test Ediliyor...';
      btnTest.disabled = true;
      showStatus('info', 'Emby / Jellyfin sunucusu ile bağlantı kuruluyor...');

      try {
        const resp = await fetch('/api/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const res = await resp.json();
        if (res.ok) {
          const typeLabel = res.serverType === 'jellyfin' ? 'Jellyfin' : 'Emby';
          showStatus('success', '✅ <strong>Bağlantı Başarılı!</strong> Sunucu: ' + (res.serverName || typeLabel) + ' (' + (res.productName || typeLabel) + ' v' + (res.version || 'Bilinmiyor') + '), Kullanıcı: ' + (res.userName || data.username));
        } else {
          showStatus('error', '❌ <strong>Bağlantı Başarısız:</strong> ' + (res.error || 'Sunucuya erişilemedi.'));
        }
      } catch (err) {
        showStatus('error', '❌ <strong>Ağ Hatası:</strong> ' + err.message);
      } finally {
        testIcon.textContent = '🔍';
        testText.textContent = 'Bağlantıyı Test Et';
        btnTest.disabled = false;
      }
    });

    // Manifest URL'si Üret
    const btnGenerate = document.getElementById('btnGenerate');
    const resultCard = document.getElementById('resultCard');
    const manifestUrlText = document.getElementById('manifestUrlText');
    const qrcodeContainer = document.getElementById('qrcode');
    let qrInstance = null;

    btnGenerate.addEventListener('click', () => {
      const data = getFormData();
      if (!data) return;

      const token = encodeBase64Url(JSON.stringify(data));
      const origin = window.location.origin;
      const manifestUrl = origin + '/' + token + '/manifest.json';

      manifestUrlText.textContent = manifestUrl;
      resultCard.classList.add('show');
      showStatus('success', '✅ Kişisel Manifest URL\\'si başarıyla üretildi! Aşağıdan kopyalayabilirsiniz.');

      // QR Kod Üret
      qrcodeContainer.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        qrInstance = new QRCode(qrcodeContainer, {
          text: manifestUrl,
          width: 140,
          height: 140,
          colorDark: '#0f172a',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      }

      resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Kopyala Butonu
    const btnCopy = document.getElementById('btnCopy');
    const copyText = document.getElementById('copyText');
    const copyIcon = document.getElementById('copyIcon');

    btnCopy.addEventListener('click', () => {
      const url = manifestUrlText.textContent;
      if (!url) return;

      navigator.clipboard.writeText(url).then(() => {
        copyText.textContent = 'Kopyalandı!';
        copyIcon.textContent = '✓';
        setTimeout(() => {
          copyText.textContent = 'Kopyala';
          copyIcon.textContent = '📋';
        }, 2000);
      }).catch(() => {
        copyText.textContent = 'Ctrl+C ile Kopyala';
      });
    });
  </script>
</body>
</html>`;

// Cloudflare Worker Code Template
const WORKER_CODE = `/**
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

const BASE_MANIFEST = ${JSON.stringify(UNIFIED_MANIFEST, null, 2)};
const EMBY_BASE_CODE = ${JSON.stringify(embyJsContent)};
const HTML_PAGE = ${JSON.stringify(HTML_CONFIGURATOR)};

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
  const configReplacement = \`const CONFIG = {
  serverUrl: \${JSON.stringify(config.serverUrl || "")},
  username: \${JSON.stringify(config.username || "")},
  password: \${JSON.stringify(config.password || "")},
  debugMode: \${Boolean(config.debugMode)},
  apiKey: \${JSON.stringify(config.apiKey || "")},
  userId: \${JSON.stringify(config.userId || "")}
};
const LOG_ENDPOINT = \${JSON.stringify(config.logEndpoint || "")};\`;

  return baseCode.replace(/const CONFIG = \\{[\\s\\S]*?\\};\\s*const LOG_ENDPOINT = .*?;/, configReplacement);
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

  const match = displayTitle.match(/\\b(\\d+k|4k|2160p|1440p|1080p|720p|576p|480p|sd)\\b/i);
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
  return \`\${videoStream.Width}x\${videoStream.Height}\`;
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
    return \`\${displayCodec} 10bit\`;
  }
  if (Number(videoStream.BitDepth) >= 10 && !displayCodec.includes("10bit")) {
    return \`\${displayCodec} 10bit\`;
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
    displayCodec = \`\${displayCodec} Atmos\`;
  }

  let channelStr = "";
  if (channels === 1) channelStr = "Mono";
  else if (channels === 2) channelStr = "2.0";
  else if (channels === 6) channelStr = "5.1";
  else if (channels === 8) channelStr = "7.1";
  else if (channels) channelStr = \`\${channels}ch\`;

  return channelStr ? \`\${displayCodec} \${channelStr}\` : displayCodec;
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
  return \`\${mbps}Mbps\`;
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
  return \`\${size.toFixed(decimals)}\${units[unitIndex]}\`;
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

  return lines.join("\\n") || "Direct Play";
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
  let serverUrl = (userConfig.serverUrl || "").trim().replace(/\\/+$/, '');
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
      const r = await fetch(\`\${serverUrl}\${prefix}/System/Info/Public\`, {
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
    const authEndpoints = [\`\${serverUrl}\${effectivePrefix}/Users/AuthenticateByName\`];
    if (effectivePrefix !== '') authEndpoints.push(\`\${serverUrl}/Users/AuthenticateByName\`);
    else authEndpoints.push(\`\${serverUrl}/emby/Users/AuthenticateByName\`);

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

  const idInfo = parseInputId(rawId, type);
  const isSeries = idInfo.mediaType === "tv";
  const itemType = isSeries ? "Series" : "Movie";

  const apiHeaders = {
    'Accept': 'application/json',
    'X-Emby-Token': apiKey,
    'X-MediaBrowser-Token': apiKey,
    'Authorization': \`MediaBrowser Token="\${apiKey}"\`
  };

  // 2. Search item by ProviderId
  let matchedItem = null;
  const providerFormats = idInfo.isImdb
    ? [\`imdb.\${idInfo.cleanId}\`, \`Imdb.\${idInfo.cleanId}\`]
    : [\`tmdb.\${idInfo.cleanId}\`, \`Tmdb.\${idInfo.cleanId}\`];

  for (const prefix of [effectivePrefix, effectivePrefix === '' ? '/emby' : '']) {
    if (matchedItem) break;
    for (const pId of providerFormats) {
      const url = \`\${serverUrl}\${prefix}/Users/\${userId}/Items?AnyProviderIdEquals=\${encodeURIComponent(pId)}&IncludeItemTypes=\${itemType}&Recursive=true&Fields=ProviderIds,Name,Id,MediaSources&api_key=\${encodeURIComponent(apiKey)}\`;
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
      const url = \`\${serverUrl}/Items?AnyProviderIdEquals=\${encodeURIComponent(pId)}&IncludeItemTypes=\${itemType}&Recursive=true&Fields=ProviderIds,Name,Id,MediaSources&api_key=\${encodeURIComponent(apiKey)}\`;
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
  let targetItemId = matchedItem.Id;
  if (isSeries && idInfo.targetSeason && idInfo.targetEpisode) {
    try {
      const seasonsUrl = \`\${serverUrl}\${effectivePrefix}/Shows/\${matchedItem.Id}/Seasons?UserId=\${encodeURIComponent(userId)}&api_key=\${encodeURIComponent(apiKey)}\`;
      const sRes = await fetch(seasonsUrl, { headers: apiHeaders });
      if (sRes.ok) {
        const sData = await sRes.json();
        const season = (sData.Items || []).find(s => s.IndexNumber === idInfo.targetSeason);
        if (season) {
          const epUrl = \`\${serverUrl}\${effectivePrefix}/Shows/\${matchedItem.Id}/Episodes?SeasonId=\${encodeURIComponent(season.Id)}&UserId=\${encodeURIComponent(userId)}&Fields=MediaSources,Name,Id,IndexNumber,ParentIndexNumber&api_key=\${encodeURIComponent(apiKey)}\`;
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

  // 4. Get PlaybackInfo
  let sources = [];
  try {
    const pbRes = await fetch(\`\${serverUrl}\${effectivePrefix}/Items/\${targetItemId}/PlaybackInfo?api_key=\${encodeURIComponent(apiKey)}&UserId=\${encodeURIComponent(userId)}\`, {
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
    const filename = source.Path ? source.Path.split(/[\\\\/]/).pop() : (source.Name || "stream");
    const streamUrl = \`\${serverUrl}\${effectivePrefix}/Videos/\${targetItemId}/stream.\${container.toLowerCase()}?static=true&MediaSourceId=\${encodeURIComponent(source.Id)}&api_key=\${encodeURIComponent(apiKey)}\`;

    // Extract subtitles
    const subtitles = [];
    const subStreams = mediaStreams.filter(s => s.Type === "Subtitle");
    for (const sub of subStreams) {
      const subIndex = sub.Index;
      const subUrl = \`\${serverUrl}\${effectivePrefix}/Videos/\${targetItemId}/\${source.Id}/Subtitles/\${subIndex}/Stream.vtt?api_key=\${encodeURIComponent(apiKey)}\`;
      subtitles.push({
        id: \`sub-\${subIndex}\`,
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
        bingeGroup: \`\${streamProviderName}-\${(qualityTag || "Direct Play").trim()}\`
      },
      subtitles: subtitles
    };
  });
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
        let serverUrl = (body.serverUrl || '').trim().replace(/\\/+$/, '');
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
            const r = await fetch(\`\${serverUrl}\${prefix}/System/Info/Public\`, {
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
          const authEndpoints = [\`\${serverUrl}\${effectivePrefix}/Users/AuthenticateByName\`];
          if (effectivePrefix !== '') authEndpoints.push(\`\${serverUrl}/Users/AuthenticateByName\`);
          else authEndpoints.push(\`\${serverUrl}/emby/Users/AuthenticateByName\`);

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

        const serverDisplayName = serverType === 'jellyfin' ? 'Jellyfin Server' : 'Emby Server';
        return new Response(JSON.stringify({
          ok: true,
          serverType: serverType,
          serverName: info.ServerName || serverDisplayName,
          productName: info.ProductName || serverDisplayName,
          version: info.Version || 'Bilinmiyor',
          userName: authResult && authResult.User ? authResult.User.Name : username
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

    // 4. Stremio Addon Stream Resolution: /:config/stream/:type/:id.json
    const streamMatch = pathname.match(/^\\/([^\\/]+)\\/stream\\/([^\\/]+)\\/([^\\/]+)\\.json$/);
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

    // 5. Dynamic Path with Config: /:config/manifest.json or /:config/(providers/)?emby.js
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
      if (remainingPath === 'manifest.json') {
        const customManifest = JSON.parse(JSON.stringify(BASE_MANIFEST));
        const displayName = (userConfig.serverType === 'jellyfin' || (userConfig.serverUrl && userConfig.serverUrl.toLowerCase().includes('jellyfin'))) ? 'Jellyfin' : 'Emby';
        if (userConfig.username) {
          customManifest.name = \`\${displayName} (\${userConfig.username})\`;
        } else {
          customManifest.name = displayName;
        }
        if (customManifest.scrapers && customManifest.scrapers.length > 0) {
          customManifest.scrapers[0].hasSettings = false;
          customManifest.scrapers[0].name = displayName;
          if (userConfig.serverUrl) {
            customManifest.scrapers[0].description = \`\${displayName} (\${userConfig.serverUrl})\`;
          }
        }

        return new Response(JSON.stringify(customManifest, null, 2), {
          status: 200,
          headers: corsHeaders({
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
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
`;

fs.writeFileSync(WORKER_OUTPUT_PATH, WORKER_CODE, 'utf8');
console.log('✅ Cloudflare Worker başarıyla derlendi: ' + WORKER_OUTPUT_PATH);
