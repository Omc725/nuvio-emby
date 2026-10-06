# Nuvio Emby & Jellyfin Media Provider Plugin

Nuvio medya oynatıcısı için yerel veya uzak **Emby** ve **Jellyfin** sunucularına bağlanarak film ve dizi içeriklerini doğrudan oynatma (Direct Play) bağlantılarıyla getiren bağımsız eklenti (provider) ve Cloudflare Worker servisi.

Bu eklenti, Nuvio'nun cihaz üzerindeki yerleşik **QuickJS (sandboxed ES2020)** motoru ile %100 uyumlu olacak şekilde geliştirilmiştir.

---

## 🚀 Özellikler

- **Çift Sunucu Desteği & Otomatik Algılama (Auto-Detection):** Emby ve Jellyfin sunucularını otomatik tanır. Sunucu türünüze göre API yollarını (Jellyfin root `/Videos/...` ve Emby `/emby/...`) ve kimlik doğrulama başlıklarını dinamik olarak ayarlar; kullanıcı müdahalesi veya ayrı eklenti gerektirmez.
- **Direct Play (Doğrudan Oynatma):** Sunucu üzerinde transcode yapmadan orijinal video ve ses kalitesinde doğrudan oynatma URL'leri üretir.
- **Dinamik Kalite & Başlık Tespiti:** HEVC, H.264, VP9 gibi video codec'lerini, 5.1/7.1 ses kanallarını ve bitrate bilgisini ayrıştırarak `Direct Play • HEVC • 5.1 AC3 (24 Mbps)` formatında açıklayıcı başlıklar sunar.
- **Akıllı ID Desteği:**
  - TMDB ID (örn: `550`)
  - IMDb ID (örn: `tt0137523`)
  - Her iki kimlik tipi için otomatik önceliklendirme ve geri dönüş (fallback) mekanizması.
- **Dizi ve Film Desteği:** Hem filmleri hem de `tv` / `series` içeriklerini sezon ve bölüm (`SxxExx`) eşleştirmesi ile çözer.
- **Gelişmiş Altyazı Desteği:**
  - Harici (`IsExternal: true`) veya web uyumlu (`srt`, `vtt`, `subrip`) altyazıları otomatik ayıklar.
  - Dil kodlarını ISO 639-1 formatına (örn: `tur` -> `tr`, `eng` -> `en`) dönüştürür.
  - VTT akış uç noktasına dönüştürerek oynatıcıya sunar.
- **Hata Toleransı (Resilience):** Ağ kopması veya bulunamayan medyada çökme yaşanmaz; boş dizi (`[]`) döner.

---

## ⚙️ Kurulum Yöntemleri (Gizlilik & Güvenlik)

Bu depo **tamamen güvenli ve genel (public) kullanıma uygundur**. Kod içerisine herhangi bir şifre veya API anahtarı gömülmemiştir.

---

### Yöntem 1: Cloudflare Worker ile Kişiye Özel Manifest URL'si (ÖNERİLEN & EN PRATİK)

Eklenti, bünyesinde ücretsiz ve sunucusuz çalışan bir **Cloudflare Worker** barındırır. Bu yöntemle Emby veya Jellyfin bilgilerinizi web arayüzünden girip anında Nuvio'ya eklenebilecek kişisel bir manifest bağlantısı ve **QR Kod** alırsınız.

1. Cloudflare Dashboard'da ücretsiz bir Worker oluşturun (veya `npx wrangler deploy` çalıştırın).
2. [`cloudflare-worker/worker.js`](cloudflare-worker/worker.js) kodunu yapıştırıp kaydedin.
3. Size verilen Worker adresini tarayıcınızda açın (örn: `https://nuvio-emby.<hesap>.workers.dev`).
4. Emby veya Jellyfin sunucu adresinizi, kullanıcı adı ve şifrenizi (veya API Anahtarınızı) girin.
5. **🔍 Bağlantıyı Test Et** butonuna basın (servis Emby veya Jellyfin olduğunu otomatik algılayıp sunucu sürümünü teyit eder).
6. **⚡ Manifest URL'si Üret** butonuna basarak size özel oluşturulan manifest bağlantısını kopyalayın (veya QR kodu telefonunuzla taratın).
7. Nuvio uygulamasında **Ayarlar > Eklentiler > Eklenti Ekle** kısmına bu bağlantıyı yapıştırın.

> 🔒 **Gizlilik Güvencesi:** Bilgileriniz hiçbir veri tabanına kaydedilmez. Yapılandırma istemci tarafında URL-safe Base64 olarak kodlanır.

Detaylı rehber için: [Cloudflare Worker Dokümantasyonu](cloudflare-worker/README.md)

---

### Yöntem 2: Nuvio Uygulama İçi Ayarlar (Cihaz Üzerinden Yapılandırma)

Eklenti, Nuvio'nun yerel ayarlar arayüzünü (`onSettings`) destekler.

1. Nuvio uygulamasında `manifest.json` adresinizi ekleyin.
2. Eklenti listesinde **Emby / Jellyfin** seçeneğine veya yanındaki **Ayarlar (Dişli)** simgesine tıklayın.
3. Açılan formdan şu alanları doldurun:
   - **Sunucu Adresi:** `http://192.168.1.100:8096` veya `https://media.ornek.com`
   - **Kullanıcı Adı:** Emby veya Jellyfin kullanıcı adınız
   - **Şifre:** Hesap şifreniz (şifresiz hesap ise boş bırakın)
   - **API Anahtarı:** Alternatif olarak doğrudan API Key (opsiyonel)
4. Kaydedin. Bilgiler sadece kendi cihazınızdaki Nuvio uygulamasında saklanır.

---

## 🧪 Test ve Derleme

Eklentiyi yerel ortamda derlemek ve test etmek için:

```bash
# Eklentiyi ve Cloudflare Worker'ı derle
npm run build

# Otomatik testleri çalıştır
npm test
```

---

## 📁 Proje Yapısı

```text
nuvio-emby/
├── cloudflare-worker/     # Kişiselleştirilmiş manifest ve yapılandırıcı servisi
│   ├── worker.js          # Derlenmiş, tek dosya Cloudflare Worker kodu
│   ├── wrangler.toml      # Wrangler CLI yapılandırması
│   └── README.md          # Worker kurulum ve dağıtım rehberi
├── scripts/
│   └── build-worker.js    # Worker derleme ve kaynak enjeksiyon betiği
├── src/
│   └── emby.js            # Modüler kaynak kodlar
├── providers/
│   └── emby.js            # Nuvio için derlenmiş sağlayıcı kopyası
├── emby.js                # ES2016 QuickJS uyumlu ana derlenmiş kod
├── manifest.json          # Nuvio eklenti bildirim dosyası
├── test/
│   └── test-emby.js       # Kapsamlı otomatik test senaryoları
├── package.json
└── README.md
```
