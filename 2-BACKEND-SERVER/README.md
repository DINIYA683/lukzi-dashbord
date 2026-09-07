# 🚀 LUKZI GANG STORE - BACKEND API SERVER

This package contains the complete Node.js / Express backend server for **LUKZI GANG STORE**.
Handles orders, instant slip verification, key delivery, user authentication, HWID resets, and Discord Bot communication.

---

## ⚙️ HOW TO RUN LOCALLY:
1. Open terminal in this folder:
   ```bash
   npm install
   node server.js
   ```
   (Or double click `start-server.bat`)
2. Server runs at: `http://localhost:5000`

---

## 🌐 HOW TO HOST FREE ONLINE (RENDER / RAILWAY / VPS):

### 1. Render.com හරහා Host කිරීම (Free Web Service):
1. Sign up on [Render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository containing this `2-BACKEND-SERVER` folder.
4. Settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. In **Environment Variables**, add:
   - `PORT` = `5000`
   - `NODE_ENV` = `production`
   - `ADMIN_MASTER_PIN` = `LukziMaster@2026`
6. Click **Create Web Service**. Your backend API will be live with a free `https://...onrender.com` URL!

### 2. Default Administrator Account:
- **Username**: `admin`
- **Password**: `Admin@Lukzi2026!`
*(You can change this password or manage users directly inside the Admin Dashboard)*
