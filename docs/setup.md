# Kurulum Rehberi

Bu rehber, Cognitive Logix için yerel geliştirme (local development) ortamını yapılandırmak için gereken adımları özetler.

## Ön Koşullar
- Node.js (v18+)
- Python (v3.9+)
- Bir Supabase projesi (API URL ve Anon Key değerleri)

## Backend Yapılandırması

Backend servisleri, makine öğrenmesi modellerini ve API uç noktalarını (endpoint) barındırır.

1. Backend dizinine gidin:
   ```bash
   cd backend
   ```

2. Python sanal ortamını (virtual environment) oluşturun:
   ```bash
   python -m venv venv
   ```

3. Sanal ortamı etkinleştirin:
   - Windows için: `venv\Scripts\activate`
   - Mac/Linux için: `source venv/bin/activate`

4. Bağımlılıkları yükleyin:
   ```bash
   pip install -r requirements.txt
   ```

5. Geliştirme sunucusunu başlatın:
   ```bash
   uvicorn app.main:app --reload
   ```

API `http://localhost:8000` adresinde hizmet verecektir. Swagger dokümantasyonuna `http://localhost:8000/docs` adresinden erişebilirsiniz.

## Frontend Yapılandırması

Frontend deposu (repository), Control Tower (Kontrol Kulesi) React uygulamasını içerir.

1. Frontend dizinine gidin:
   ```bash
   cd frontend
   ```

2. Node bağımlılıklarını yükleyin:
   ```bash
   npm install
   ```

3. Ortam Değişkenlerini (Environment Variables) Yapılandırın:
   `frontend` dizininin kökünde bir `.env` dosyası oluşturun ve Supabase kimlik bilgilerinizi girin:
   ```env
   VITE_SUPABASE_URL=sizin_supabase_url_adresiniz
   VITE_SUPABASE_ANON_KEY=sizin_supabase_anon_key_degeriniz
   ```

4. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```

Uygulama `http://localhost:5173` adresinde yayında olacaktır.
