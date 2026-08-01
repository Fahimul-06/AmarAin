# Render deployment

Root Directory: leave blank if package.json is at repository root.

Build Command:
```bash
npm install && npm run build
```

Start Command:
```bash
npm start
```

Health Check Path: `/api/health`

Required environment variables:
- `NODE_VERSION=22.14.0`
- `NODE_ENV=production`
- `MONGODB_URI=<MongoDB Atlas URI>`
- `JWT_SECRET=<long random secret>`
- `CLIENT_URL=https://<your-render-service>.onrender.com`

The root build script explicitly installs development dependencies for both the Vite client and TypeScript server. This prevents Render's production install mode from omitting `vite` and `typescript`.
