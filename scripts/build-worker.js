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
const manifestContent = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

// HTML Configurator Template
const HTML_CONFIGURATOR = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuvio Emby - Kişisel Eklenti Yapılandırıcı</title>
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

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

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

    .container {
      width: 100%;
      max-width: 640px;
    }

    .header {
      text-align: center;
      margin-bottom: 2rem;
    }

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

    .subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
    }

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

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #e2e8f0;
    }

    .label-hint {
      font-size: 0.75rem;
      font-weight: 400;
      color: var(--text-muted);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    input[type="text"],
    input[type="password"] {
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

    input[type="text"]:focus,
    input[type="password"]:focus {
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

    .toggle-pwd:hover {
      color: var(--text);
    }

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

    .collapsible-trigger:hover {
      color: var(--text);
    }

    .collapsible-content {
      display: none;
      padding-top: 1rem;
      border-top: 1px solid var(--card-border);
      margin-top: 0.5rem;
    }

    .collapsible-content.open {
      display: block;
    }

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

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
    }

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

    .status-box.show {
      display: flex;
    }

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

    /* Result Card */
    .result-card {
      display: none;
      animation: fadeIn 0.3s ease;
    }

    .result-card.show {
      display: block;
    }

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

    .copy-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }

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

    #qrcode img {
      display: block;
    }

    .steps-list {
      margin-top: 1.25rem;
      padding-left: 1.2rem;
      color: #cbd5e1;
      font-size: 0.875rem;
    }

    .steps-list li {
      margin-bottom: 0.5rem;
    }

    .steps-list li strong {
      color: #ffffff;
    }

    .footer {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8rem;
      margin-top: 1rem;
    }

    .footer a {
      color: #cbd5e1;
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>

  <div class="container">
    <div class="header">
      <div class="badge-row">
        <div class="badge">
          <span class="badge-dot"></span>
          Emby v3.5.0
        </div>
        <div class="badge">
          Nuvio Native Direct Play
        </div>
      </div>
      <h1>Nuvio Emby Yapılandırıcı</h1>
      <p class="subtitle">Emby sunucunuzu bağlayın ve Nuvio için kişiselleştirilmiş manifest bağlantınızı oluşturun.</p>
    </div>

    <!-- Yapılandırma Formu -->
    <div class="card">
      <form id="configForm" onsubmit="return false;">
        <div class="form-group">
          <label for="serverUrl">
            Emby Sunucu Adresi
            <span class="label-hint">Örn: https://emby.myserver.com</span>
          </label>
          <div class="input-wrapper">
            <input type="text" id="serverUrl" placeholder="http://192.168.1.100:8096 veya https://emby.alanadi.com" required autocomplete="off">
          </div>
        </div>

        <div class="form-group">
          <label for="username">
            Kullanıcı Adı
            <span class="label-hint">Emby kullanıcı adınız</span>
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
      <p style="font-size: 0.85rem; color: var(--text-muted);">Aşağıdaki bağlantı sadece sizin sunucunuz ve kimlik bilgilerinizle yapılandırılmış özel eklenti adresidir.</p>

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

      <h4 style="font-size: 0.95rem; font-weight: 700; margin-top: 1rem; color: #f1f5f9;">📲 Nuvio'ya Nasıl Eklenir?</h4>
      <ol class="steps-list">
        <li>Yukarıdaki URL'yi kopyalayın.</li>
        <li><strong>Nuvio</strong> uygulamasını açın ve <strong>Ayarlar (Settings) > Eklentiler (Plugins)</strong> bölümüne gidin.</li>
        <li><strong>Eklenti Ekle (Add Plugin)</strong> butonuna basarak URL'yi yapıştırın ve onaylayın.</li>
        <li>Artık Emby içerikleriniz doğrudan Direct Play hızında Nuvio oynatıcınızda listelenecektir!</li>
      </ol>
    </div>

    <div class="footer">
      <p>🔒 <strong>Sıfır Günlük ve Güvenlik Garantisi:</strong> Kimlik bilgileriniz hiçbir sunucuda depolanmaz. Yapılandırma istemci tarafında URL-safe Base64 olarak kodlanır.</p>
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
      showStatus('info', 'Emby sunucusu ile bağlantı kuruluyor...');

      try {
        const resp = await fetch('/api/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const res = await resp.json();
        if (res.ok) {
          showStatus('success', '✅ <strong>Bağlantı Başarılı!</strong> Sunucu: ' + (res.serverName || 'Emby') + ' (v' + (res.version || 'Bilinmiyor') + '), Kullanıcı: ' + (res.userName || data.username));
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
 *  2. Personalized dynamic manifest at /:config/manifest.json
 *  3. Injected transpiled emby.js at /:config/providers/emby.js and /:config/emby.js
 *  4. Live connection test proxy at /api/test-connection
 *  5. Unconfigured fallback at /manifest.json and /providers/emby.js
 */

const BASE_MANIFEST = ${JSON.stringify(manifestContent, null, 2)};
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

        // Test server public info
        let info = null;
        let effectivePrefix = '';
        for (const prefix of ['', '/emby']) {
          try {
            const r = await fetch(\`\${serverUrl}\${prefix}/System/Info/Public\`, {
              headers: { 'Accept': 'application/json' }
            });
            if (r.ok) {
              info = await r.json();
              effectivePrefix = prefix;
              break;
            }
          } catch (e) {}
        }

        if (!info) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'Emby sunucusuna bağlanılamadı. Adresi (ve varsa port numarasını) kontrol edin.'
          }), {
            status: 200,
            headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
          });
        }

        // Test User Authentication if username provided
        let authResult = null;
        if (username) {
          try {
            const authRes = await fetch(\`\${serverUrl}\${effectivePrefix}/Users/AuthenticateByName\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Emby-Authorization': 'MediaBrowser Client="Nuvio Configurator", Device="Web", DeviceId="nuvio-worker-test", Version="3.5.0"'
              },
              body: JSON.stringify({ Username: username, Pw: password })
            });

            if (authRes.ok) {
              authResult = await authRes.json();
            } else {
              return new Response(JSON.stringify({
                ok: false,
                error: 'Sunucu bulundu ancak kullanıcı adı veya şifre geçersiz (HTTP ' + authRes.status + ').'
              }), {
                status: 200,
                headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
              });
            }
          } catch (authErr) {
            return new Response(JSON.stringify({
              ok: false,
              error: 'Kullanıcı doğrulama hatası: ' + authErr.message
            }), {
              status: 200,
              headers: corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
            });
          }
        }

        return new Response(JSON.stringify({
          ok: true,
          serverName: info.ServerName || 'Emby Server',
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

    // 4. Dynamic Path with Config: /:config/manifest.json or /:config/(providers/)?emby.js
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

      // Personalized Manifest
      if (remainingPath === 'manifest.json') {
        const customManifest = JSON.parse(JSON.stringify(BASE_MANIFEST));
        if (userConfig.username) {
          customManifest.name = \`Nuvio Emby (\${userConfig.username})\`;
        }
        if (customManifest.scrapers && customManifest.scrapers.length > 0) {
          customManifest.scrapers[0].hasSettings = false; // Already pre-configured!
          if (userConfig.serverUrl) {
            customManifest.scrapers[0].description = \`Emby (\${userConfig.serverUrl})\`;
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
