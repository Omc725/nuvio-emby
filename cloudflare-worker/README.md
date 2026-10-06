# Nuvio Emby & Jellyfin Cloudflare Worker

Nuvio için Emby ve Jellyfin eklentisini internet üzerinden kişiselleştirilmiş olarak dağıtmanızı sağlayan **ücretsiz, sunucusuz (serverless)** Cloudflare Worker çözümü.

Bu servis sayesinde:
- 📱 Nuvio'ya eklenti kurmadan önce web arayüzünden Emby veya Jellyfin sunucu adresinizi ve giriş bilgilerinizi girersiniz.
- ⚡ Size özel, şifrelenmiş bir **Kişisel Manifest URL'si** ve **QR Kod** üretilir.
- 🔍 Sunucunuzun Emby veya Jellyfin olduğu otomatik tespit edilir ve sürüm bilgisi doğrulanır.
- 🔒 **Sıfır Günlük & Güvenlik:** Bilgileriniz hiçbir veri tabanında tutulmaz. Yapılandırma doğrudan URL parametresi içinde Base64 olarak taşınır ve Nuvio oynatıcınıza dinamik olarak enjekte edilir.

---

## 🚀 Kurulum Yöntemleri

### Yöntem 1: Cloudflare Web Arayüzünden Kurulum (En Kolay - Program Gerektirmez)

1. [Cloudflare Dashboard](https://dash.cloudflare.com)'a ücretsiz kaydolun veya giriş yapın.
2. Sol menüden **Compute (Workers & Pages)** > **Workers & Pages** bölümüne gidin.
3. **Create** (Oluştur) > **Worker** butonuna tıklayın.
4. İsim olarak `nuvio-emby` verin ve **Deploy** butonuna basın.
5. Dağıtım tamamlandıktan sonra sağ üstteki **Edit Code** (Kodu Düzenle) butonuna tıklayın.
6. Sol taraftaki kod editörünün içindeki tüm içeriği silin ve buradaki [`worker.js`](./worker.js) dosyasının tüm içeriğini yapıştırın.
7. Sağ üstteki **Save and Deploy** (Kaydet ve Dağıt) butonuna basın.
8. Artık worker adresiniz hazır! (Örn: `https://nuvio-emby.<hesap-adiniz>.workers.dev`)

---

### Yöntem 2: Wrangler CLI ile Kurulum (Terminalden Tek Komut)

Proje kök dizininde veya bu dizinde terminal açarak:

```bash
# 1. Cloudflare hesabınıza giriş yapın (tarayıcıda onay verin)
npx wrangler login

# 2. Worker'ı yayınlayın
npx wrangler deploy
```

Komut tamamlandığında terminal size canlı URL'nizi verecektir (örn: `https://nuvio-emby.<subdomain>.workers.dev`).

---

## 🎯 Kullanım Adımları

1. Oluşturulan Worker URL'sini tarayıcınızda açın (örn: `https://nuvio-emby.<kullanici>.workers.dev`).
2. Açılan modern Türkçe arayüzden:
   - **Sunucu Adresi:** Emby veya Jellyfin sunucunuzun IP veya domain adresi (örn: `https://media.ornek.com` veya `http://192.168.1.100:8096`)
   - **Kullanıcı Adı & Şifre:** Sunucu giriş bilgileriniz (veya doğrudan API Anahtarı)
3. **🔍 Bağlantıyı Test Et** butonuna basarak sunucunuzun erişilebilir olduğunu ve türünü (Emby / Jellyfin) anında teyit edin.
4. **⚡ Manifest URL'si Üret** butonuna basın.
5. Üretilen bağlantıyı kopyalayın veya ekrandaki QR kodu telefonunuzla taratın.
6. **Nuvio** uygulamasında:
   - **Ayarlar (Settings)** > **Eklentiler (Plugins)** > **Eklenti Ekle (Add Plugin)** yolunu izleyin.
   - Kopyaladığınız adresi yapıştırın.
7. Bitti! Artık Emby veya Jellyfin kütüphanenizdeki tüm dizi ve filmler Nuvio'da Direct Play ve Türkçe/İngilizce altyazı desteğiyle hazır!
