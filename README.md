# Olive & Oak - Full Stack Application

This workspace now contains a working full-stack MVP based on your specification:

- React Native mobile app (premium UI)
- Python FastAPI backend
- MongoDB integration
- Personalized quiz -> home feed -> catalog -> cart -> checkout flow
- Chatbot endpoint and image analysis endpoint (soft filter)

## Project Structure

- `backend/` FastAPI + MongoDB services
- `mobile/` Expo React Native app
- `olive_oak_system_spec.dm` product and architecture master spec

## 1) Backend Setup (FastAPI)

### Install

1. Open terminal in `backend/`
2. Create and activate virtual environment
3. Install dependencies:

```powershell
pip install -r requirements.txt
```

### Environment

1. Copy `.env.example` to `.env`
2. Set values:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `SECRET_KEY`
- Optional AI keys (`GROQ_API_KEY`)

The backend `.env` is already created with your provided Mongo URL and bootstrap admin credentials.

### Run

```powershell
python run.py
```

API base: `http://localhost:8000/api/v1`

## 2) Mobile Setup (Expo)

### Install

1. Open terminal in `mobile/`
2. Install packages:

```powershell
npm install
```

### Environment

1. Copy `.env.example` to `.env`
2. Set (optional, recommended for physical devices):

- `EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api/v1` (physical device)

If `EXPO_PUBLIC_API_URL` is empty, the app auto-detects:

- Web/iOS simulator: `localhost`
- Android emulator: `10.0.2.2`

### Run

```powershell
npm run start
```

## Implemented Features

### Auth + Roles

- Register and login endpoints
- JWT access token auth
- Role field present (`customer`/`admin`)

### Quiz (3 Steps)

- Aesthetic card selection with images/placeholders
- Mood card selection with images/placeholders
- Budget slider (0-10000) + extra preferences text
- DB persistence in `user_preferences`

### Personalized Home

- Olive & Oak title + tagline
- 4 GLB object cards in horizontal circular row (native + web 3D rendering)
- Personalized product ranking
- Search within personalized picks
- Floating chatbot panel (bottom-right) with better error handling

### Premium UX + Responsive Layout

- Responsive layout system for mobile, tablet, and web desktop widths
- Adaptive product grids, premium cards, and richer empty/error states
- Search, sort, and filter features across product browsing flows
- Upgraded cart with quantity controls and remove actions
- Improved checkout success experience and order visibility

### Catalog + Cart + Checkout

- Open category catalog from GLB row
- Add products to cart
- Cart view with totals
- Demo payment flow (`/cart/demo-payment/create` -> `/cart/demo-payment/confirm`) creates confirmed order

### AI Endpoints

- `/ai/chat`: profile-aware recommendation response
- `/ai/analyze-image`: soft-filter compatible response schema

### Admin Endpoints

- Product create/update
- CSV import endpoint
- Orders listing

## APIs/Credentials Needed From Your Side

To make all production features fully live, please provide:

1. **Groq API Key**

- Needed to replace fallback AI behavior with live LLM and vision responses.
- Add to backend `.env` as `GROQ_API_KEY`.

2. **Payment Gateway Credentials (only when you move from demo payment to real gateway)**

- Razorpay preferred for INR:
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - Webhook secret

3. **Storage/CDN (optional but recommended)**

- S3-compatible bucket credentials for product images/GLB uploads.

4. **Admin bootstrap account (already seeded)**

- Email: `admin@gmail.com`
- Password: `Admin123`

## Notes

- For security, keep credentials only in `.env`; do not hardcode in source.
- Sample products/categories/quiz config are auto-seeded at backend startup.
- Home categories are mapped to local files in `mobile/assets/GLB`.
- Production-focused backend upgrades include trusted hosts, configurable CORS, security headers, DB indexes, and `/health/live` + `/health/ready` endpoints.

## Next Build Step I Can Do Immediately

- Wire real Groq chatbot + image analysis into `/ai/chat` and `/ai/analyze-image` using your key.
- Add payment provider integration and webhook verification.
- Add CSV import templates and validation report UI in mobile admin flow.
