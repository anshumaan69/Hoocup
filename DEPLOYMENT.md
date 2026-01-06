# Deployment Guide

## 1. Prerequisites
- A **GitHub** account.
- Accounts on **Vercel** (for Frontend) and **Render** (for Backend).

## 2. Prepare the Code
1.  **Push to GitHub**:
    ```bash
    git add .
    git commit -m "Ready for deploy"
    git push origin main
    ```

## 3. Deploy Backend (Render)
1.  Go to [Render Dashboard](https://dashboard.render.com/) -> New -> **Web Service**.
2.  Connect your GitHub repo.
3.  **Settings**:
    - **Root Directory**: `server`
    - **Build Command**: `npm install`
    - **Start Command**: `node src/index.js`
4.  **Environment Variables**:
    - Add `MONGO_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, etc. (Copy from your `.env`).
    - Add `GCP_PROJECT_ID`, `GCP_BUCKET_NAME`, and `GCP_SERVICE_ACCOUNT` (Paste the JSON string carefully).
    - Set `CLIENT_URL` to your future frontend URL (e.g. `https://hoocup.vercel.app`).
5.  Click **Deploy**. Copy the URL Render gives you (e.g. `https://hoocup-api.onrender.com`).

## 4. Deploy Frontend (Vercel)
1.  Go to [Vercel Dashboard](https://vercel.com/new).
2.  Import your GitHub repo.
3.  **Settings**:
    - **Root Directory**: Select requests `client`.
    - **Environment Variables**:
      - Name: `NEXT_PUBLIC_API_URL`
      - Value: `https://hoocup-api.onrender.com/api/auth` (Must include `/api/auth` at the end).
      - Name: `NEXT_PUBLIC_GCP_BUCKET_NAME`
      - Value: [Your Bucket Name]
      - *Note: If `CLIENT_URL` on Render is set to your Vercel URL, Google Login will work automatically without manual redirect URI matching.*
4.  Click **Deploy**.

## 5. Final Setup
- Go to Google Cloud Console and add your new Vercel URL to "Authorized Javascript Origins" and "Authorized Redirect URIs".

## How to Make Changes Later
Simply edit your code and push to GitHub:
```bash
git add .
git commit -m "Fixed a bug"
git push
```
**Vercel and Render will automatically detect the push and redeploy your app within minutes.**
