# YBÜ İnsülin İnfüzyon KDS — Prototip

Erişkin yoğun bakımda IV regular insülin infüzyonu için offline PWA prototipi.

## İçerik
- 1 Ü/mL hazırlama ve setin 20 mL insülin solüsyonu geçirilerek yıkanması bilgisi
- Standart hedef 140–180 mg/dL
- Liberal hedef 140–200 mg/dL
- HbA1c >%8 uyarısı
- Başlangıç dozu
- Saatlik glukoz değişim hızı
- Δ bazlı doz titrasyonu
- Hipoglisemi güvenlik dalı
- 30–60 dk kontrol kuralı
- Offline service worker

## Çalıştırma
Service worker için dosyaları basit bir HTTP sunucusunda açın:

```bash
python3 -m http.server 8080
```

Sonra tarayıcıda `http://localhost:8080` adresini açın.

## Uyarı
Bu yazılım klinik prototiptir. Klinik kullanımdan önce yerel protokol, hekim, hemşirelik ve eczane ekiplerince doğrulanmalı ve valide edilmelidir.
