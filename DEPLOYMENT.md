# Deployment Guide (Render.com)

This project uses **Node.js**, **PostgreSQL**, and **Redis**. The best place to deploy all three for **free** (or very low cost) is [Render.com](https://render.com).

## Prerequisites
1.  Push your code to a public/private **GitHub Repository**.

## Step 1: Create Database (PostgreSQL)
1.  Log in to dashboard.render.com.
2.  Click **New +** -> **PostgreSQL**.
3.  **Name**: `eterna-db`.
4.  **Region**: Choose one close to you (e.g., Singapore, Frankfurt, Ohio).
5.  **Plan**: Select **Free**.
6.  Click **Create Database**.
7.  *Wait for it to initialize*. Copy the **Internal Database URL** (it starts with `postgres://...`). You will need this later.

## Step 2: Create Redis
1.  Click **New +** -> **Redis**.
2.  **Name**: `eterna-redis`.
3.  **Region**: **Must be same as Database** (important for internal networking).
4.  **Plan**: Select **Free**.
5.  Click **Create Redis**.
6.  *Wait for it to initialize*. Copy the **Internal Redis URL** (it starts with `redis://...`).

## Step 3: Deploy Web Service
1.  Click **New +** -> **Web Service**.
2.  Connect your GitHub repository.
3.  **Name**: `eterna-api`.
4.  **Region**: **Must be same as DB & Redis**.
5.  **Runtime**: **Node**.
6.  **Build Command**: `npm install && npx prisma generate && npm run build`
    *   *Note: We added `npx prisma generate` to ensure the client is built.*
7.  **Start Command**: `npm start`
8.  **Plan**: Select **Free**.
9.  **Environment Variables** (Click "Advanced"):
    *   `DATABASE_URL`: Paste the **Internal Database URL** from Step 1.
    *   `REDIS_URL`: Paste the **Internal Redis URL** from Step 2.
    *   `NODE_ENV`: `production`
    *   `PORT`: `3000` (Render detects this automatically, but good to be explicit).

## Step 4: Finalize
1.  Click **Create Web Service**.
2.  Render will clone your repo, install dependencies, build the TS files, and start the server.
3.  Once the logs say "Server listening...", your API is live!
4.  Get your public URL from the top left (e.g., `https://eterna-api.onrender.com`).

## Verification
You can use your local `scripts/web_demo.ts` (modifying the fetch URL) or Postman to test the live endpoint:
`POST https://your-app.onrender.com/api/orders/execute`

> **Note on Free Tier**: Render's free web services "spin down" after inactivity. The first request might take 50s to wake up. This is normal for free hosting.
