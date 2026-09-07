const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Storefront Website Main Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Dashboard & Admin Route (LUKZI ASSISTANT Telemetry & Order Management)
app.get(['/dashboard', '/admin'], (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Static file hosting for website & uploaded payment slips
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Data files
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');
const HWID_FILE = path.join(__dirname, 'data', 'hwid_requests.json');
const FEEDBACKS_FILE = path.join(__dirname, 'data', 'feedbacks.json');
const REDEEM_CODES_FILE = path.join(__dirname, 'data', 'redeem_codes.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const KEYS_STOCK_FILE = path.join(__dirname, 'data', 'keys_stock.json');
const INBOX_FILE = path.join(__dirname, 'data', 'inbox.json');
const BANNED_USERS_FILE = path.join(__dirname, 'data', 'banned_users.json');

// Check if user is banned (Cross-checks username, discord handle, email, and IP)
function getUserBanRecord(username = '', email = '', ip = '') {
    try {
        let banned = readJSON(BANNED_USERS_FILE);
        if (!Array.isArray(banned) || banned.length === 0) return null;
        
        const cleanU = (username || '').toString().toLowerCase().trim().replace(/^@/, '');
        const cleanE = (email || '').toString().toLowerCase().trim();
        const clientIp = (ip || '').toString().trim();

        // Cross-reference data/users.json to find associated discord, username, and email
        let checkHandles = new Set();
        if (cleanU) checkHandles.add(cleanU);
        
        let users = readJSON(USERS_FILE);
        if (Array.isArray(users)) {
            const matchedUser = users.find(u => 
                (cleanU && u.username && u.username.toLowerCase() === cleanU) ||
                (cleanU && u.discord && u.discord.toLowerCase().replace(/^@/, '') === cleanU) ||
                (cleanE && u.email && u.email.toLowerCase() === cleanE)
            );
            if (matchedUser) {
                if (matchedUser.username) checkHandles.add(matchedUser.username.toLowerCase());
                if (matchedUser.discord) checkHandles.add(matchedUser.discord.toLowerCase().replace(/^@/, ''));
                if (matchedUser.contact) checkHandles.add(matchedUser.contact.toLowerCase().replace(/^@/, ''));
                if (matchedUser.email) checkHandles.add(matchedUser.email.toLowerCase());
            }
        }

        return banned.find(b => {
            const bu = (b.username || '').toString().toLowerCase().trim().replace(/^@/, '');
            const be = (b.email || '').toString().toLowerCase().trim();
            const bip = (b.ip || '').toString().trim();

            const isUserMatch = bu && checkHandles.has(bu);
            const isEmailMatch = cleanE && be && cleanE === be;
            // Exclude localhost from mass IP ban
            const isIpMatch = clientIp && bip && clientIp === bip && clientIp !== '127.0.0.1' && clientIp !== '::1' && clientIp !== '::ffff:127.0.0.1';

            return isUserMatch || isEmailMatch || isIpMatch;
        }) || null;
    } catch(e) {
        return null;
    }
}

function isUserBanned(username = '', email = '', ip = '') {
    return !!getUserBanRecord(username, email, ip);
}

// 🚫 Real-time Ban Verification API
app.get('/api/users/check-ban', (req, res) => {
    try {
        const username = req.query.username || req.query.discord || '';
        const email = req.query.email || '';
        const ip = req.ip || req.headers['x-forwarded-for'] || '';

        const ban = getUserBanRecord(username, email, ip);
        res.json({
            success: true,
            banned: !!ban,
            reason: ban ? (ban.reason || 'Banned by Store Admin') : null,
            bannedAt: ban ? ban.bannedAt : null,
            username
        });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Discord Config
const BUY_WEBHOOK_URL = "https://discord.com/api/webhooks/1545110861742612545/3RvzYZShNcoplN8UnEYHWIMpQ2_R8WzDz7u_ihBHQ7w-OAgHf4e5d57-SF-jPMd4eByn";
const BUY_CHANNEL_ID = "1545110332714913853";
const HWID_WEBHOOK_URL = "https://discord.com/api/webhooks/1545112640857178283/z6aBJYdWOJv7ys-P_kBD4wsinpF36w2X4ziuszUhbbOKhkKlvNPXo2GLVB4L7NNJfLGI";
const HWID_CHANNEL_ID = "1545110740296536114";

// 🎮 DISCORD ADMIN STAFF LIVE PRESENCE MATRIX API (POWERED BY DISCORD BOT & DISCORD IDS)
app.get('/api/discord-status', async (req, res) => {
    try {
        let botRes = await fetch('http://localhost:3001/bot-presence').catch(() => null);
        if (!botRes || !botRes.ok) {
            botRes = await fetch('http://localhost:3002/bot-presence').catch(() => null);
        }
        if (botRes && botRes.ok) {
            const botData = await botRes.json();
            if (botData && botData.success && Array.isArray(botData.admins)) {
                return res.json({
                    success: true,
                    admins: botData.admins,
                    serverOnline: true,
                    activeSupport: "24/7 LIVE",
                    timestamp: Date.now()
                });
            }
        }
    } catch(e) {}

    // Real Discord Profile Fallback Data (Exact CDN Avatars & Real Statuses)
    res.json({
        success: true,
        admins: [
            { id: "lukzi", discordId: "1393634997495271516", username: "LUKZI", role: "FOUNDER & OWNER", status: "offline", statusText: "STATUS: OFFLINE", avatar: "https://cdn.discordapp.com/avatars/1393634997495271516/37ac5cc309a4762e484b88d167289d3c.png?size=256" },
            { id: "sodium", discordId: "1318949297223630849", username: "SODIUM 2.0", role: "HEAD ADMIN", status: "dnd", statusText: "STATUS: DO NOT DISTURB", avatar: "https://cdn.discordapp.com/avatars/1318949297223630849/387ee2a81b19dba6aa72678b8aa96d1a.png?size=256" },
            { id: "rider", discordId: "1096068679118110832", username: "RIDER", role: "SENIOR ADMIN", status: "offline", statusText: "STATUS: OFFLINE", avatar: "https://cdn.discordapp.com/avatars/1096068679118110832/c3abbf2229d68a86b7bca97e8686c0d4.png?size=256" },
            { id: "shathux", discordId: "823218404202512444", username: "SHATHUX", role: "JUNIOR ADMIN", status: "offline", statusText: "STATUS: OFFLINE", avatar: "https://cdn.discordapp.com/avatars/823218404202512444/ee04ef16f681ad9ab9ec0c29fa0d7a8e.png?size=256" }
        ],
        serverOnline: true,
        activeSupport: "24/7 LIVE",
        timestamp: Date.now()
    });
});

// Configure Multer storage for payment slips
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.png';
        const prefix = file.fieldname === 'proofFile' ? 'proof-' : 'slip-';
        cb(null, prefix + uniqueSuffix + ext);
    }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Helper: read/write JSON
function readJSON(filePath) {
    try {
        if (!fs.existsSync(filePath)) return [];
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (!raw || !raw.trim() || raw.charCodeAt(0) === 0) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : (typeof parsed === 'object' && parsed !== null ? parsed : []);
    } catch(e) {
        console.error(`Read JSON error on ${filePath}:`, e.message);
        return [];
    }
}
function writeJSON(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const tmpPath = filePath + '.tmp';
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
        fs.renameSync(tmpPath, filePath);
    } catch(e) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch(err) {
            console.error(`Write JSON error on ${filePath}:`, err.message);
        }
    }
}

// Security Helpers: Salted PBKDF2 Password Hashing & Rate Limiter
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
}

function verifyPassword(password, storedHash, storedSalt) {
    if (!storedHash || !storedSalt) return false;
    const verifyHash = crypto.pbkdf2Sync(password, storedSalt, 10000, 64, 'sha512').toString('hex');
    return storedHash === verifyHash;
}

// Anti Brute-Force Rate Limiter
const loginAttemptsMap = new Map();
function checkLoginRateLimit(ip, username = '') {
    // Whitelist localhost, private network, and admin/owner user so you are never locked out
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || 
        ip.includes('127.0.0.1') || ip.includes('::ffff:127.0.0.1') || 
        username === '1' || username === 'admin' || username.toLowerCase() === 'diniya') {
        return true;
    }
    const now = Date.now();
    const record = loginAttemptsMap.get(ip) || { count: 0, resetTime: now + 5 * 60 * 1000 };
    if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + 5 * 60 * 1000;
    }
    if (record.count >= 200) return false;
    record.count++;
    loginAttemptsMap.set(ip, record);
    return true;
}

function resetLoginRateLimit(ip) {
    if (ip) loginAttemptsMap.delete(ip);
}

// Ensure Admin account exists in users.json
function ensureAdminAccount() {
    let users = readJSON(USERS_FILE);
    if (!Array.isArray(users)) users = [];
    const hasAdmin = users.some(u => u.username && u.username.toLowerCase() === 'admin');
    if (!hasAdmin) {
        const { hash, salt } = hashPassword('Admin@Lukzi2026!');
        const adminUser = {
            id: 'USR-ADMIN',
            username: 'admin',
            email: 'admin@lukzi.io',
            passwordHash: hash,
            salt: salt,
            discord: 'LukziAdmin#0001',
            contact: 'LukziAdmin#0001',
            role: 'ADMINISTRATOR',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
            createdAt: new Date().toLocaleString(),
            isAuth: true
        };
        users.push(adminUser);
        writeJSON(USERS_FILE, users);
        console.log('[🛡️] Created secure default Admin account (admin / Admin@Lukzi2026!)');
    }
}
ensureAdminAccount();

// =========================================================================
// 🔐 AUTHENTICATION APIS (REAL SECURE LOGIN, REGISTRATION, DISCORD & GOOGLE AUTH)
// =========================================================================
app.post(['/api/auth/register', '/api/users/register'], (req, res) => {
    try {
        const { username, email, password, discord } = req.body;
        const cleanUser = (username || '').trim();
        const cleanPass = (password || '').trim();
        const cleanEmail = (email || `${cleanUser.toLowerCase()}@lukzi.io`).trim().toLowerCase();
        const cleanDiscord = (discord || cleanUser || 'DiscordUser').trim().replace(/^@/, '');
        const clientIp = req.ip || req.headers['x-forwarded-for'] || '';

        if (isUserBanned(cleanUser, cleanEmail, clientIp) || isUserBanned(cleanDiscord, cleanEmail, clientIp)) {
            return res.status(403).json({ error: '🚫 YOUR ACCOUNT HAS BEEN BANNED BY STORE ADMIN!' });
        }

        if (!cleanUser || !cleanPass) {
            return res.status(400).json({ error: 'Username and Password are required.' });
        }

        let users = readJSON(USERS_FILE);
        if (!Array.isArray(users)) users = [];

        let existing = users.find(u => 
            (u.username && u.username.toLowerCase() === cleanUser.toLowerCase()) || 
            (u.email && u.email.toLowerCase() === cleanEmail)
        );

        const { hash, salt } = hashPassword(cleanPass);
        const sessionToken = crypto.randomBytes(32).toString('hex');

        if (existing) {
            existing.passwordHash = hash;
            existing.salt = salt;
            existing.sessionToken = sessionToken;
            existing.lastUpdated = new Date().toLocaleString();
            writeJSON(USERS_FILE, users);

            const { passwordHash: _1, salt: _2, password: _3, ...safeUser } = existing;
            console.log(`[+] User account updated with new password: ${cleanUser}`);
            return res.json({ success: true, message: 'Account updated successfully with new password!', user: safeUser, token: sessionToken });
        }

        const newUser = {
            id: 'USR-' + Math.floor(10000 + Math.random() * 90000),
            username: cleanUser,
            email: cleanEmail,
            passwordHash: hash,
            salt: salt,
            discord: cleanDiscord,
            contact: cleanDiscord,
            role: cleanUser.toLowerCase() === 'admin' ? 'ADMINISTRATOR' : 'MEMBER',
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUser}`,
            sessionToken: sessionToken,
            createdAt: new Date().toLocaleString(),
            isAuth: true
        };

        users.push(newUser);
        writeJSON(USERS_FILE, users);

        const { passwordHash: _1, salt: _2, password: _3, ...safeUser } = newUser;
        console.log(`[+] New user registered securely: ${cleanUser} (Discord: @${cleanDiscord})`);
        res.json({ success: true, message: 'Account registered successfully!', user: safeUser, token: sessionToken });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Manual or instant rate limit reset endpoint
app.all('/api/auth/reset-rate-limit', (req, res) => {
    loginAttemptsMap.clear();
    res.json({ success: true, message: 'All rate limits reset and cleared!' });
});

app.post('/api/auth/login', (req, res) => {
    try {
        const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
        const { identifier, password } = req.body;
        const cleanId = (identifier || '').trim().toLowerCase();
        const cleanPass = (password || '').trim();

        if (!checkLoginRateLimit(clientIp, cleanId)) {
            return res.status(429).json({ error: 'Too many login attempts. Please wait 2 minutes or use Master PIN.' });
        }

        if (isUserBanned(cleanId, '', clientIp)) {
            return res.status(403).json({ error: '🚫 YOUR ACCOUNT HAS BEEN BANNED BY STORE ADMIN!' });
        }

        if (!cleanId || !cleanPass) {
            return res.status(400).json({ error: 'Username/Email and Password are required.' });
        }

        let users = readJSON(USERS_FILE);
        if (!Array.isArray(users)) users = [];

        let found = users.find(u => 
            (u.username && u.username.toLowerCase() === cleanId) || 
            (u.email && u.email.toLowerCase() === cleanId) ||
            (u.discord && u.discord.toLowerCase() === cleanId)
        );

        if (!found) {
            return res.status(401).json({ error: 'Invalid Username/Email or Password.' });
        }

        // Strict Ban Check against all user identities
        if (isUserBanned(cleanId, '', clientIp) || 
            (found && (isUserBanned(found.username, found.email, clientIp) || isUserBanned(found.discord, found.email, clientIp)))) {
            return res.status(403).json({ error: '🚫 YOUR ACCOUNT HAS BEEN BANNED BY STORE ADMIN!', banned: true });
        }

        let isMatch = false;
        if (found.passwordHash && found.salt) {
            isMatch = verifyPassword(cleanPass, found.passwordHash, found.salt);
        } else if (found.password) {
            if (found.password === cleanPass) {
                isMatch = true;
                const { hash, salt } = hashPassword(cleanPass);
                found.passwordHash = hash;
                found.salt = salt;
                delete found.password;
                writeJSON(USERS_FILE, users);
            }
        }

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid Username/Email or Password.' });
        }

        // Optional 2FA only when explicitly requested
        if (req.body.requires2FA === true) {
            const authId = req.body.authId || ('AUTH-' + Math.floor(10000 + Math.random() * 90000));
            
            try {
                fetch('http://localhost:3001/api/auth/request-2fa', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        authId: authId,
                        username: found.username || 'user',
                        ip: clientIp,
                        userAgent: req.headers['user-agent']
                    })
                }).catch(err => console.error("2FA dispatch fetch error:", err.message));
            } catch(e) {}

            return res.json({
                success: true,
                requires2FA: true,
                authId: authId,
                username: found.username || 'user',
                message: '2FA Approval Request dispatched to Discord Admin Channel!'
            });
        }

        const sessionToken = crypto.randomBytes(32).toString('hex');
        found.sessionToken = sessionToken;
        found.lastLogin = new Date().toLocaleString();
        writeJSON(USERS_FILE, users);

        const { passwordHash: _1, salt: _2, password: _3, ...safeUser } = found;
        safeUser.isAuth = true;
        safeUser.contact = safeUser.discord || safeUser.username;
        console.log(`[+] User logged in securely: ${found.username} (@${safeUser.contact})`);
        res.json({ success: true, message: 'Logged in successfully!', user: safeUser, token: sessionToken });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to verify 2FA Approval Status from Discord Bot or Master PIN
app.post('/api/auth/verify-2fa', async (req, res) => {
    try {
        const { authId, identifier, masterPin } = req.body;
        if (!authId) {
            return res.status(400).json({ error: 'authId is required' });
        }

        // Query Discord Bot running on port 3001
        const botRes = await fetch(`http://localhost:3001/api/auth/check-2fa/${authId}`).catch(() => null);
        if (!botRes || !botRes.ok) {
            return res.json({ status: 'PENDING' });
        }

        const botData = await botRes.json();
        if (botData.status === 'APPROVED') {
            let users = readJSON(USERS_FILE);
            if (!Array.isArray(users)) users = [];
            const cleanId = (identifier || botData.username || '').trim().toLowerCase();
            let found = users.find(u => 
                (u.username && u.username.toLowerCase() === cleanId) || 
                (u.email && u.email.toLowerCase() === cleanId) ||
                (u.discord && u.discord.toLowerCase() === cleanId)
            );
            if (!found) {
                return res.status(404).json({ error: 'User not found in system.' });
            }
            const sessionToken = crypto.randomBytes(32).toString('hex');
            found.sessionToken = sessionToken;
            found.lastLogin = new Date().toLocaleString();
            writeJSON(USERS_FILE, users);

            const { passwordHash: _1, salt: _2, password: _3, ...safeUser } = found;
            safeUser.isAuth = true;
            return res.json({
                success: true,
                status: 'APPROVED',
                user: safeUser,
                token: sessionToken
            });
        } else if (botData.status === 'REJECTED') {
            return res.json({ status: 'REJECTED', error: 'Login Rejected & Blocked by Admin in Discord!' });
        } else if (botData.status === 'EXPIRED') {
            return res.json({ status: 'EXPIRED', error: '2FA Login Request Timed Out (60s).' });
        } else {
            return res.json({ status: 'PENDING' });
        }
    } catch(err) {
        return res.json({ status: 'PENDING' });
    }
});

// Secure instant manual 2FA approve webhook for server administrator
app.post('/api/auth/instant-approve-2fa', async (req, res) => {
    try {
        const { authId, pin } = req.body;
        const validAdminPin = process.env.ADMIN_MASTER_PIN || 'LukziMaster@2026';
        if (pin && pin === validAdminPin) {
            try {
                await fetch(`http://localhost:3001/api/auth/approve-2fa/${authId}`, { method: 'POST' });
            } catch(e) {}
            return res.json({ success: true, status: 'APPROVED', message: 'Master Admin Approved!' });
        }
        res.status(401).json({ success: false, error: 'Unauthorized PIN' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.post(['/api/auth/discord', '/api/users/discord-auth', '/api/auth/discord-login'], (req, res) => {
    try {
        const rawDiscord = req.body.discordUsername || req.body.discord || req.body.username || req.body.identifier || '';
        const cleanDiscord = (rawDiscord || '').trim().replace(/^@/, '');
        const clientIp = req.ip || req.headers['x-forwarded-for'] || '';

        if (isUserBanned(cleanDiscord, '', clientIp)) {
            return res.status(403).json({ error: '🚫 YOUR ACCOUNT HAS BEEN BANNED BY STORE ADMIN!' });
        }

        const fakeList = ['none', 'asdf', 'test', 'fake', 'guest'];
        if (!cleanDiscord || cleanDiscord.length < 2 || fakeList.includes(cleanDiscord.toLowerCase())) {
            return res.status(400).json({ error: '⚠️ Valid Discord Username is required for authorization.' });
        }

        const displayName = cleanDiscord.includes('#') ? cleanDiscord.split('#')[0] : cleanDiscord;

        let users = readJSON(USERS_FILE);
        if (!Array.isArray(users)) users = [];

        let found = users.find(u => 
            (u.discord && u.discord.toLowerCase() === cleanDiscord.toLowerCase()) || 
            (u.username && u.username.toLowerCase() === displayName.toLowerCase()) ||
            (u.username && u.username.toLowerCase() === cleanDiscord.toLowerCase())
        );

        const sessionToken = crypto.randomBytes(32).toString('hex');

        if (!found) {
            found = {
                id: 'USR-' + Math.floor(10000 + Math.random() * 90000),
                username: displayName,
                email: `${displayName.toLowerCase()}@discord.user`,
                discord: cleanDiscord,
                contact: cleanDiscord,
                role: displayName.toLowerCase() === 'admin' ? 'ADMINISTRATOR' : 'MEMBER',
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${displayName}`,
                sessionToken: sessionToken,
                createdAt: new Date().toLocaleString(),
                isAuth: true
            };
            users.push(found);
            writeJSON(USERS_FILE, users);
            console.log(`[+] Registered new user via Discord: @${cleanDiscord}`);
        } else {
            found.sessionToken = sessionToken;
            found.lastLogin = new Date().toLocaleString();
            if (!found.discord) found.discord = cleanDiscord;
            writeJSON(USERS_FILE, users);
            console.log(`[+] User logged in via Discord: @${cleanDiscord}`);
        }

        const { passwordHash: _1, salt: _2, password: _3, ...safeUser } = found;
        safeUser.isAuth = true;
        safeUser.contact = safeUser.discord || cleanDiscord;
        res.json({ success: true, message: 'Discord Authorization Successful!', user: safeUser, token: sessionToken });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/google', (req, res) => {
    try {
        const { email, name } = req.body;
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanName = (name || cleanEmail.split('@')[0] || 'GoogleGamer').trim();
        const clientIp = req.ip || req.headers['x-forwarded-for'] || '';

        if (isUserBanned(cleanName, cleanEmail, clientIp)) {
            return res.status(403).json({ error: '🚫 YOUR ACCOUNT HAS BEEN BANNED BY STORE ADMIN!' });
        }

        if (!cleanEmail) {
            return res.status(400).json({ error: 'Google email is required.' });
        }

        let users = readJSON(USERS_FILE);
        if (!Array.isArray(users)) users = [];

        let found = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);

        if (!found) {
            found = {
                id: 'USR-' + Math.floor(10000 + Math.random() * 90000),
                username: cleanName,
                email: cleanEmail,
                password: 'google_oauth_' + Math.random().toString(36),
                discord: cleanName,
                contact: cleanName,
                role: 'MEMBER',
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanName}`,
                createdAt: new Date().toLocaleString(),
                isAuth: true
            };
            users.push(found);
            writeJSON(USERS_FILE, users);
            console.log(`[+] Registered new user via Google Sign-In: ${cleanEmail}`);
        }

        const { password: _, ...safeUser } = found;
        safeUser.isAuth = true;
        res.json({ success: true, message: 'Google Sign-In Successful!', user: safeUser });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
// 👤 USER PROFILE EDIT & NAME CHANGE API
// =========================================================================
app.post(['/api/user/update-profile', '/api/auth/update-profile'], (req, res) => {
    try {
        const { currentUsername, newUsername, avatar, discord, role, bio } = req.body;
        const cleanCurrent = (currentUsername || '').trim();
        const cleanNew = (newUsername || '').trim();
        const cleanDiscord = (discord || '').trim().replace(/^@/, '');
        const cleanAvatar = (avatar || '').trim();
        const cleanRole = (role || '').trim();
        const cleanBio = (bio !== undefined) ? String(bio).trim() : undefined;

        if (!cleanCurrent && !cleanNew) {
            return res.status(400).json({ error: 'Username is required.' });
        }

        let users = readJSON(USERS_FILE);
        if (!Array.isArray(users)) users = [];

        let user = users.find(u => u.username && u.username.toLowerCase() === (cleanCurrent || cleanNew).toLowerCase());

        if (cleanNew && cleanNew.toLowerCase() !== (cleanCurrent || '').toLowerCase()) {
            const taken = users.find(u => u.username && u.username.toLowerCase() === cleanNew.toLowerCase() && (!user || u.id !== user.id));
            if (taken) {
                return res.status(400).json({ error: 'That username is already taken. Please choose another.' });
            }
        }

        const effectiveName = cleanNew || cleanCurrent;

        if (user) {
            if (cleanNew) user.username = cleanNew;
            if (cleanAvatar) user.avatar = cleanAvatar;
            if (cleanDiscord) {
                user.discord = cleanDiscord;
                user.contact = cleanDiscord;
            }
            if (cleanRole) user.role = cleanRole;
            if (cleanBio !== undefined) user.bio = cleanBio;
            user.lastUpdated = new Date().toLocaleString();
            writeJSON(USERS_FILE, users);

            const { passwordHash: _1, salt: _2, password: _3, ...safeUser } = user;
            safeUser.isAuth = true;
            console.log(`[+] User profile updated: ${cleanCurrent} -> ${effectiveName} (Role: ${user.role || 'VIP'})`);
            return res.json({ success: true, message: 'Profile updated successfully!', user: safeUser });
        } else {
            // Guest or session user: create / save user entry
            const newUser = {
                id: 'USR-' + Math.floor(10000 + Math.random() * 90000),
                username: effectiveName,
                email: `${effectiveName.toLowerCase()}@user.lukzi`,
                discord: cleanDiscord || effectiveName,
                contact: cleanDiscord || effectiveName,
                role: cleanRole || 'VERIFIED VIP',
                bio: cleanBio || '',
                avatar: cleanAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${effectiveName}`,
                createdAt: new Date().toLocaleString(),
                isAuth: true
            };
            users.push(newUser);
            writeJSON(USERS_FILE, users);
            console.log(`[+] Created new profile entry on edit: ${effectiveName}`);
            return res.json({ success: true, message: 'Profile saved successfully!', user: newUser });
        }
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
// 💬 DIRECT MESSAGE (DM) TO OFFICIAL STAFF API
// =========================================================================
app.post('/api/staff/send-dm', async (req, res) => {
    try {
        const { staffId, staffName, senderName, senderDiscord, category, message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message content is required.' });
        }

        const targetStaffName = (staffName || 'Staff Member').trim();
        const clientSender = (senderName || 'Customer').trim();
        const clientDiscord = (senderDiscord || clientSender).trim().replace(/^@/, '');
        const dmCategory = (category || 'General Support').trim();

        // Staff Discord ID directory
        const staffDiscordMap = {
            'lukzi': '1393634997495271516',
            'sodium': '1318949297223630849',
            'rider': '1096068679118110832',
            'shathux': '823218404202512444'
        };
        const staffKey = (staffId || '').toLowerCase();
        const targetDiscordId = staffDiscordMap[staffKey] || '';

        const dmId = 'DM-' + Math.floor(10000 + Math.random() * 90000);

        // 1. Transmit via Discord Webhook
        try {
            const mentionText = targetDiscordId ? `<@${targetDiscordId}>` : `@Staff`;
            const embed = {
                title: `💬 INCOMING DIRECT MESSAGE: ${targetStaffName.toUpperCase()}`,
                color: staffKey === 'sodium' ? 0xef4444 : (staffKey === 'lukzi' ? 0xa855f7 : 0x00f2fe),
                description: `**To:** ${targetStaffName} (${mentionText})\n**From:** \`${clientSender}\` (@${clientDiscord})\n**Category:** \`${dmCategory}\`\n\n**Message Content:**\n\`\`\`\n${message.trim()}\n\`\`\``,
                fields: [
                    { name: "🆔 Message ID", value: `\`${dmId}\``, inline: true },
                    { name: "👤 Sender Discord", value: `\`@${clientDiscord}\``, inline: true },
                    { name: "🎯 Target Staff", value: `${targetStaffName} ${targetDiscordId ? '(<@' + targetDiscordId + '>)' : ''}`, inline: true },
                    { name: "⚡ Action Required", value: `Please reply to @${clientDiscord} directly on Discord or Web Dashboard.`, inline: false }
                ],
                footer: { text: "LUKZI GANG Official Staff Direct Messaging Matrix" },
                timestamp: new Date().toISOString()
            };

            fetch(BUY_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: "LUKZI GANG STAFF DM BOT",
                    avatar_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200",
                    content: `🚨 **NEW DIRECT MESSAGE FOR ${targetStaffName.toUpperCase()}** ${mentionText}\nFrom: **@${clientDiscord}**`,
                    embeds: [embed]
                })
            }).catch(e => console.error("Staff DM Webhook failed:", e.message));
        } catch(wErr) {
            console.error("Staff DM Webhook error:", wErr.message);
        }

        // 2. Add confirmation to user's Inbox
        try {
            let inboxList = readJSON(INBOX_FILE);
            if (!Array.isArray(inboxList)) inboxList = [];

            const userInboxMsg = {
                id: 'MSG-' + dmId,
                username: clientSender,
                targetUser: clientSender,
                contact: clientDiscord,
                title: `💬 DM SENT TO ${targetStaffName.toUpperCase()} // ${dmCategory}`,
                body: `You sent a direct message to ${targetStaffName}:\n\n"${message.trim()}"\n\n✅ Your message was dispatched directly to staff. ${targetStaffName} will reply to you on Discord (@${clientDiscord}) or via your Inbox!`,
                date: new Date().toLocaleString(),
                read: false
            };
            inboxList.unshift(userInboxMsg);
            writeJSON(INBOX_FILE, inboxList);
        } catch(iErr) {
            console.error("Inbox save error for Staff DM:", iErr.message);
        }

        console.log(`[💬] Direct Message sent from @${clientSender} to ${targetStaffName} (ID: ${dmId})`);
        res.json({
            success: true,
            dmId,
            message: `Your Direct Message has been delivered directly to ${targetStaffName}!`,
            staffName: targetStaffName
        });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
// 🛒 1. API: SUBMIT CUSTOMER ORDER & SLIP
// =========================================================================
app.post('/api/orders', upload.single('slip'), async (req, res) => {
    try {
        const { contact, product, duration, amount, email, paymentMethod } = req.body;
        const buyerContact = (contact || '').trim().replace(/^@/, '');
        const clientIp = req.ip || req.headers['x-forwarded-for'] || '';

        if (isUserBanned(buyerContact, email || '', clientIp)) {
            return res.status(403).json({ error: '🚫 YOUR ACCOUNT HAS BEEN BANNED BY STORE ADMIN!' });
        }

        // 1. Mandatory Discord Username Validation
        const fakeList = ['none', 'asdf', 'test', 'fake', '123', 'guest', 'null', 'undefined'];
        if (!buyerContact || buyerContact.length < 2 || fakeList.includes(buyerContact.toLowerCase())) {
            return res.status(400).json({ error: '⚠️ Valid Discord Username is REQUIRED for order processing! (e.g. lukzigang250)' });
        }

        // 2. MANDATORY Payment Slip Screenshot File Check
        if (!req.file) {
            return res.status(400).json({ error: '⛔ Payment slip upload is MANDATORY! Please upload your payment receipt/slip screenshot image file.' });
        }

        const orderId = '#ORD-' + Math.floor(10000 + Math.random() * 90000);
        const buyerUsername = buyerContact.includes('#') ? buyerContact.split('#')[0] : buyerContact;
        const currentProduct = product || 'INTERNAL PANEL V4';
        const selectedDuration = duration || '1 Month';
        const currentPrice = amount || '$24.99';
        const selectedPayMethod = paymentMethod || 'Bank Transfer';

        const slipFilename = req.file.filename;
        const slipFilePath = req.file.path;
        const slipUrl = `/uploads/${slipFilename}`;

        const newOrder = {
            id: orderId,
            buyer: buyerUsername,
            contact: buyerContact,
            email: email || '',
            product: currentProduct,
            duration: selectedDuration,
            amount: currentPrice,
            paymentMethod: selectedPayMethod,
            slipFile: slipFilename,
            slipUrl: slipUrl,
            status: 'PENDING',
            date: new Date().toLocaleString(),
            key: null
        };

        // Save order to persistent data/orders.json
        let orders = readJSON(ORDERS_FILE);
        if (!Array.isArray(orders)) orders = [];
        orders.unshift(newOrder);
        writeJSON(ORDERS_FILE, orders);
        console.log(`[+] New order recorded: ${orderId} by ${buyerContact} (${selectedPayMethod})`);

        // Dispatch to Discord Webhook asynchronously (non-blocking for ultra-fast response)
        (async () => {
            try {
                const embedObj = {
                    title: '🛒 NEW CUSTOMER ORDER & PAYMENT SLIP // ' + orderId,
                    color: 0x10b981,
                    description: `**Discord Customer:** \`${buyerContact}\`\n**Product:** **${currentProduct}**\n**Duration:** \`${selectedDuration}\`\n**Amount:** **${currentPrice}**\n**Method:** \`${selectedPayMethod}\`\n**Status:** ⏳ Pending Slip Verification`,
                    fields: [
                        { name: "👤 Buyer Contact", value: `\`${buyerContact}\``, inline: true },
                        { name: "📦 Product & Plan", value: `${currentProduct} (${selectedDuration})`, inline: true },
                        { name: "💵 Amount", value: currentPrice, inline: true },
                        { name: "💳 Method", value: selectedPayMethod, inline: true },
                        { name: "📧 Email", value: email || 'Not provided', inline: true },
                        { name: "📍 Channel", value: `<#${BUY_CHANNEL_ID}>`, inline: true }
                    ],
                    footer: { text: "LUKZI GANG Store // Order Gateway Server" },
                    timestamp: new Date().toISOString()
                };

                const payloadContent = `🚨 **NEW ORDER & PAYMENT SLIP FOR @${buyerContact.replace('@', '')}**\n📍 Channel: <#${BUY_CHANNEL_ID}>`;

                if (slipFilePath && fs.existsSync(slipFilePath)) {
                    embedObj.image = { url: "attachment://payment_slip.png" };
                    const fileBytes = fs.readFileSync(slipFilePath);
                    const fileBlob = new Blob([fileBytes], { type: (req.file && req.file.mimetype) || 'image/png' });
                    
                    const formData = new FormData();
                    formData.append('payload_json', JSON.stringify({
                        username: "LUKZI GANG STORE BOT",
                        avatar_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200",
                        content: payloadContent,
                        embeds: [embedObj]
                    }));
                    formData.append('file', fileBlob, 'payment_slip.png');

                    await fetch(BUY_WEBHOOK_URL, {
                        method: 'POST',
                        body: formData
                    });
                    console.log(`✅ Forwarded order ${orderId} with slip attachment to Discord webhook!`);
                } else {
                    await fetch(BUY_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: "LUKZI GANG STORE BOT",
                            avatar_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200",
                            content: payloadContent,
                            embeds: [embedObj]
                        })
                    });
                    console.log(`✅ Forwarded order ${orderId} (no slip) to Discord webhook!`);
                }
            } catch(discordErr) {
                console.error("Discord Webhook Forward Error:", discordErr.message);
            }
        })();

        return res.json({
            success: true,
            orderId: orderId,
            order: newOrder
        });

    } catch(err) {
        console.error("Order submission error:", err);
        return res.status(500).json({ error: "Failed to process order: " + err.message });
    }
});

// =========================================================================
// 📋 2. API: GET ALL ORDERS
// =========================================================================
app.get('/api/orders', (req, res) => {
    let orders = readJSON(ORDERS_FILE);
    if (!Array.isArray(orders)) orders = [];
    res.json({ success: true, count: orders.length, orders });
});

app.delete('/api/orders/:id', (req, res) => {
    try {
        const orderId = req.params.id;
        const cleanId = orderId.replace(/^#/, '').trim();
        let orders = readJSON(ORDERS_FILE);
        if (!Array.isArray(orders)) orders = [];

        const beforeCount = orders.length;
        orders = orders.filter(o => o.id !== orderId && o.id !== '#' + cleanId && (o.id && o.id.replace(/^#/, '') !== cleanId));

        writeJSON(ORDERS_FILE, orders);
        console.log(`[🗑️] Order deleted: ${orderId} (Remaining: ${orders.length})`);
        res.json({ success: true, deleted: beforeCount - orders.length, count: orders.length });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
// ✅ 3. API: APPROVE ORDER & ASSIGN LICENSE KEY FROM STOCK INVENTORY
// =========================================================================
app.post('/api/orders/:id/approve', (req, res) => {
    const { key, redeemCode, targetUsername, username, buyer, role, duration, customMsgBody, body } = req.body;
    const orderId = req.params.id;
    let orders = readJSON(ORDERS_FILE);
    if (!Array.isArray(orders)) orders = [];

    const order = orders.find(o => o.id === orderId || o.id === '#' + orderId || (o.id && o.id.replace('#', '') === orderId.replace('#', '')));
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    // Explicit target username specified by admin or order
    const customUser = (targetUsername || username || buyer || '').replace(/^@/, '').trim();
    if (customUser) {
        order.buyer = customUser;
        order.discordUsername = customUser;
        order.contact = customUser;
    }

    if (role) order.product = role;
    if (duration) order.duration = duration;

    const buyerUser = (order.buyer || order.discordUsername || order.contact || customUser || 'Customer').replace(/^@/, '').trim();
    const prodPrefix = (order.product || 'VIP').toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4) || 'LUKZ';

    // 1. Separate Store Redeem Code
    let assignedRedeemCode = (redeemCode || '').trim().toUpperCase();
    if (!assignedRedeemCode) {
        assignedRedeemCode = `REDEEM-${prodPrefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    // 2. Separate Software License Key
    let assignedKey = (key || '').trim().toUpperCase();
    let keySource = 'MANUAL';
    if (!assignedKey) {
        assignedKey = `LUKZI-${prodPrefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        keySource = 'AUTO_GENERATED';
    }

    order.status = 'COMPLETED';
    order.redeemCode = assignedRedeemCode;
    order.key = assignedKey;
    writeJSON(ORDERS_FILE, orders);

    // Register ONLY Store Redeem Code in REDEEM_CODES_FILE (Software License Key is kept strictly separate for hack panel activation)
    try {
        let codes = readJSON(REDEEM_CODES_FILE);
        if (!Array.isArray(codes)) codes = [];

        const cleanVal = assignedRedeemCode.replace(/\s+/g, '');
        const exists = codes.find(c => (c.code || '').trim().toUpperCase().replace(/\s+/g, '') === cleanVal);
        if (!exists) {
            codes.unshift({
                id: 'KEY-' + Math.floor(10000 + Math.random() * 90000),
                code: assignedRedeemCode,
                role: role || order.product || 'VIP UNLIMITED',
                duration: duration || order.duration || '30 Days',
                status: 'ACTIVE',
                createdAt: new Date().toLocaleString(),
                redeemedBy: null
            });
        }
        writeJSON(REDEEM_CODES_FILE, codes);
    } catch(codeErr) {
        console.error("Auto redeem code sync error:", codeErr.message);
    }

    // Automatically dispatch both Redeem Code & License Key strictly to buyerUser INBOX_FILE
    try {
        let inboxList = readJSON(INBOX_FILE);
        if (!Array.isArray(inboxList)) inboxList = [];

        const siteUrl = process.env.WEBSITE_URL || 'http://localhost:5000';
        const defaultBody = `Hello! Your order for ${order.product || 'INTERNAL PANEL'} (${order.id}) has been verified and approved by Admin!\nOfficial Store & Control Deck: ${siteUrl}/\n\nSoftware Product\n${order.product || 'INTERNAL PANEL'}\n\nLicense Status\nACTIVATED & READY\n\nYOUR GENERATED STORE REDEEM CODE\n${assignedRedeemCode}\n\nYOUR GENERATED SOFTWARE LICENSE KEY\n${assignedKey}\n\n🌐 Official Store Website Link:\n${siteUrl}\n\n💡 How to Redeem & Download Software Panel:\n🎟️ STORE REDEEM: Visit ${siteUrl} -> Open Inbox / Redeem tab -> Paste Redeem Code to unlock tools.\n🚀 PANEL DOWNLOAD: Visit ${siteUrl} -> Open Downloads tab -> Download Software Panel Executable & Setup Guide.\n\nLUKZI GANG OFFICIAL // 24/7 Automated Dispatcher`;

        let formattedBody = (customMsgBody || body || '').trim();
        if (formattedBody) {
            formattedBody = formattedBody
                .replace(/\{REDEEM_CODE\}/g, assignedRedeemCode)
                .replace(/\{LICENSE_KEY\}/g, assignedKey)
                .replace(/\{PRODUCT\}/g, order.product || 'INTERNAL PANEL')
                .replace(/\{ORDER_ID\}/g, order.id);
        } else {
            formattedBody = defaultBody;
        }

        const newMsg = {
            id: 'MSG-' + Math.floor(10000 + Math.random() * 90000),
            username: buyerUser,
            contact: buyerUser,
            orderId: order.id,
            title: `LUKZI GANG STORE // YOUR REDEEM CODE & LICENSE KEY`,
            body: formattedBody,
            redeemCode: assignedRedeemCode,
            key: assignedKey,
            date: new Date().toLocaleString(),
            read: false
        };

        const existsInInbox = inboxList.some(m => m.orderId === order.id && m.key === assignedKey && (m.username || '').toLowerCase() === buyerUser.toLowerCase());
        if (!existsInInbox) {
            inboxList.unshift(newMsg);
            writeJSON(INBOX_FILE, inboxList);
        }
    } catch(inboxErr) {
        console.error("Auto inbox dispatch error:", inboxErr.message);
    }

    // Trigger Discord Approval Webhook Notice with separate Redeem Code & License Key
    try {
        const siteUrl = process.env.WEBSITE_URL || 'http://localhost:5000';
        const embedObj = {
            title: `LUKZI GANG STORE // YOUR REDEEM CODE & LICENSE KEY (${order.id})`,
            color: 0x10b981, // Emerald Green
            description: `Hello! Your order for **${order.product || 'INTERNAL PANEL'}** (\`${order.id}\`) has been verified and approved by Admin!\nOfficial Store & Control Deck: [Click Here to Open LUKZI GANG Store](${siteUrl})\n\n**Software Product:** ${order.product || 'INTERNAL PANEL'}\n**License Status:** ✅ **ACTIVATED & READY**`,
            fields: [
                { name: "👤 Buyer Handle", value: `\`@${buyerUser}\``, inline: true },
                { name: "📦 Product & Plan", value: `${order.product || 'VIP PASS'} (${order.duration || '30 Days'})`, inline: true },
                { name: "💵 Amount Paid", value: order.amount || '$24.99', inline: true },
                { name: "🎟️ YOUR GENERATED STORE REDEEM CODE", value: `\`\`\`${assignedRedeemCode}\`\`\``, inline: false },
                { name: "🔑 YOUR GENERATED SOFTWARE LICENSE KEY", value: `\`\`\`${assignedKey}\`\`\``, inline: false },
                { name: "🌐 Store Website Link", value: `🔗 [${siteUrl}](${siteUrl})`, inline: true },
                { name: "💡 How to Redeem", value: `Copy the code above. Visit our store: [LUKZI GANG Store](${siteUrl}) Open Inbox / Redeem tab & paste your key to activate!`, inline: false },
                { name: "📍 Channel", value: `<#${BUY_CHANNEL_ID}>`, inline: true }
            ],
            footer: { text: "LUKZI GANG OFFICIAL // 24/7 Automated Dispatcher" },
            timestamp: new Date().toISOString()
        };

        fetch(BUY_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: "LUKZI GANG STORE BOT",
                avatar_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200",
                content: `🎁 **ORDER APPROVED FOR @${buyerUser}**\n📩 Redeem Code & License Key dispatched to **@${buyerUser}**'s Inbox!\n🌐 Store Website: **${siteUrl}**\n📍 Channel: <#${BUY_CHANNEL_ID}>`,
                embeds: [embedObj]
            })
        }).catch(err => console.error("Webhook dispatch fetch error:", err.message));
    } catch(e) {
        console.error("Webhook dispatch error:", e.message);
    }

    // Trigger Discord Bot DIRECT MESSAGE (DM) to customer's personal Discord Inbox
    try {
        fetch('http://localhost:3001/api/send-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: buyerUser,
                product: order.product || 'INTERNAL PANEL',
                redeemCode: assignedRedeemCode,
                licenseKey: assignedKey,
                orderId: order.id
            })
        }).then(r => r.json()).then(dmRes => {
            console.log(`[+] Discord DM Dispatch Result for @${buyerUser}:`, dmRes);
        }).catch(dmErr => console.error("Discord Bot DM dispatch call error:", dmErr.message));
    } catch(dmE) {}

    console.log(`[+] Order ${orderId} approved for target user @${buyerUser} with Redeem Code: ${assignedRedeemCode} & License Key: ${assignedKey} (Source: ${keySource}) & registered in redeem vault + inbox`);
    res.json({ success: true, orderId: order.id, redeemCode: assignedRedeemCode, key: assignedKey, source: keySource, targetUser: buyerUser, order });
});

// =========================================================================
// 📩 CUSTOMER INBOX & KEY NOTIFICATIONS API
// =========================================================================
app.get('/api/inbox/:username', (req, res) => {
    try {
        const rawUser = req.params.username || '';
        const cleanUser = rawUser.trim().toLowerCase().replace(/^@/, '').split('#')[0];
        
        if (!cleanUser) {
            return res.json({ success: true, count: 0, messages: [] });
        }

        // Cross-reference data/users.json to find all associated handles (username, discord, contact, email)
        let targetHandles = new Set([cleanUser]);
        let users = readJSON(USERS_FILE);
        if (Array.isArray(users)) {
            const matchedUser = users.find(u => 
                (u.username && u.username.toLowerCase().replace(/^@/, '').split('#')[0] === cleanUser) ||
                (u.discord && u.discord.toLowerCase().replace(/^@/, '').split('#')[0] === cleanUser) ||
                (u.contact && u.contact.toLowerCase().replace(/^@/, '').split('#')[0] === cleanUser) ||
                (u.email && u.email.toLowerCase() === cleanUser)
            );
            if (matchedUser) {
                if (matchedUser.username) targetHandles.add(matchedUser.username.toLowerCase().replace(/^@/, '').split('#')[0]);
                if (matchedUser.discord) targetHandles.add(matchedUser.discord.toLowerCase().replace(/^@/, '').split('#')[0]);
                if (matchedUser.contact) targetHandles.add(matchedUser.contact.toLowerCase().replace(/^@/, '').split('#')[0]);
                if (matchedUser.email) targetHandles.add(matchedUser.email.toLowerCase());
            }
        }

        let inbox = readJSON(INBOX_FILE);
        if (!Array.isArray(inbox)) inbox = [];

        // STRICT & MATCHING INBOX MESSAGES (User-specific or Broadcast)
        let userMessages = inbox.filter(m => {
            if (!m) return false;
            if (m.username === '*' || m.targetUser === '*') return true;
            const u = (m.username || '').toString().trim().toLowerCase().replace(/^@/, '').split('#')[0];
            const c = (m.contact || '').toString().trim().toLowerCase().replace(/^@/, '').split('#')[0];
            const b = (m.buyer || '').toString().trim().toLowerCase().replace(/^@/, '').split('#')[0];
            return targetHandles.has(u) || targetHandles.has(c) || targetHandles.has(b);
        });

        // Dynamic fallback 1: check orders.json for completed orders strictly belonging to target handles
        let orders = readJSON(ORDERS_FILE);
        if (Array.isArray(orders)) {
            orders.forEach(o => {
                if ((o.status === 'COMPLETED' || o.status === 'APPROVED') && o.key) {
                    const ob = (o.buyer || '').toString().trim().toLowerCase().replace(/^@/, '').split('#')[0];
                    const oc = (o.contact || '').toString().trim().toLowerCase().replace(/^@/, '').split('#')[0];
                    if (targetHandles.has(ob) || targetHandles.has(oc)) {
                        const alreadyInUserMsg = userMessages.some(m => m.orderId === o.id || m.key === o.key);
                        if (!alreadyInUserMsg) {
                            const siteUrl = process.env.WEBSITE_URL || 'http://localhost:5000';
                            const formattedBody = `Hello! Your order for ${o.product || 'INTERNAL PANEL'} (${o.id}) has been verified and approved by Admin! Official Store & Control Deck: ${siteUrl}/\n\nSoftware Product\n${o.product || 'INTERNAL PANEL'}\n\nLicense Status\nACTIVATED & READY\n\nYOUR GENERATED STORE REDEEM CODE\n${o.redeemCode || 'N/A'}\n\nYOUR GENERATED SOFTWARE LICENSE KEY\n${o.key}\n\nStore Website Link\n${siteUrl}\n\nHow to Redeem\nCopy the code above. Visit our store: LUKZI GANG Store Open Inbox / Redeem tab & paste your key to activate!\n\nLUKZI GANG OFFICIAL // 24/7 Automated Dispatcher`;

                            const synthMsg = {
                                id: 'MSG-' + Math.floor(10000 + Math.random() * 90000),
                                username: o.buyer || rawUser,
                                contact: o.contact || rawUser,
                                orderId: o.id,
                                title: `LUKZI GANG STORE // YOUR REDEEM CODE & LICENSE KEY`,
                                body: formattedBody,
                                redeemCode: o.redeemCode || null,
                                key: o.key,
                                date: o.date || new Date().toLocaleString(),
                                read: false
                            };
                            userMessages.unshift(synthMsg);
                            inbox.unshift(synthMsg);
                            writeJSON(INBOX_FILE, inbox);
                        }
                    }
                }
            });
        }

        // Dynamic fallback for HWID Resets: check hwid_requests.json for approved/reset requests
        let hwidReqs = readJSON(HWID_FILE);
        if (Array.isArray(hwidReqs)) {
            hwidReqs.forEach(h => {
                if (h.status === 'RESET' || h.status === 'APPROVED') {
                    const hb = (h.buyer || h.discord || h.contact || h.username || '').toString().trim().toLowerCase().replace(/^@/, '').split('#')[0];
                    if (targetHandles.has(hb)) {
                        const alreadyInMsg = userMessages.some(m => m.orderId === h.id);
                        if (!alreadyInMsg) {
                            const targetKey = h.key || h.licenseKey || 'VIP-KEY';
                            const synthHwidMsg = {
                                id: 'MSG-HWID-' + Math.floor(10000 + Math.random() * 90000),
                                username: h.username || h.buyer || cleanUser,
                                contact: h.discord || h.buyer || cleanUser,
                                buyer: h.buyer || cleanUser,
                                orderId: h.id,
                                title: `🔄 HWID RESET APPROVED & UNLINKED (${h.id})`,
                                body: `✅ YOUR HWID HAS BEEN RESET SUCCESSFULLY!\n\nHello @${h.buyer || cleanUser}!\nYour HWID Reset Request (${h.id}) has been verified and APPROVED by Store Admin.\n\n🔑 License Key: ${targetKey}\n💻 Status: UNLINKED & READY FOR NEW PC\n⏰ Reset Date: ${h.date || new Date().toLocaleString()}\n\nYour hardware ID (HWID) binding has been completely cleared. You can now use your license key on your new PC or new Windows installation without any restrictions.`,
                                key: targetKey,
                                licenseKey: targetKey,
                                isHwid: true,
                                product: 'HWID RESET SERVICE',
                                date: h.date || new Date().toLocaleString(),
                                read: false
                            };
                            userMessages.unshift(synthHwidMsg);
                            inbox.unshift(synthHwidMsg);
                            writeJSON(INBOX_FILE, inbox);
                        }
                    }
                }
            });
        }

        // Dynamic fallback 2: check redeem_codes.json for active generated redeem codes
        let codes = readJSON(REDEEM_CODES_FILE);
        if (Array.isArray(codes)) {
            codes.forEach(c => {
                if (c.status === 'ACTIVE' && c.code) {
                    const alreadyInMsg = userMessages.some(m => m.key === c.code || m.redeemCode === c.code);
                    if (!alreadyInMsg) {
                        const synthRedeemMsg = {
                            id: 'MSG-RED-' + Math.floor(10000 + Math.random() * 90000),
                            username: '*',
                            targetUser: '*',
                            title: `🎁 NEW VIP REDEEM CODE: ${c.role || 'VIP PASS'}`,
                            body: `A new VIP software redeem key (${c.duration || '30 Days'}) is generated and ready! Click REDEEM NOW to activate software access.`,
                            redeemCode: c.code,
                            key: c.code,
                            product: c.role || 'VIP PASS',
                            duration: c.duration || '30 Days',
                            date: c.createdAt || new Date().toLocaleString(),
                            read: false
                        };
                        userMessages.unshift(synthRedeemMsg);
                    }
                }
            });
        }

        res.json({ success: true, count: userMessages.length, messages: userMessages });
    } catch(err) {
        console.error("Inbox API error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/inbox/send', (req, res) => {
    try {
        const { username, contact, title, body, key, orderId } = req.body;
        const buyerUser = (username || contact || 'Customer').replace(/^@/, '').trim();
        if (!buyerUser) {
            return res.status(400).json({ error: 'Username is required' });
        }

        let inbox = readJSON(INBOX_FILE);
        if (!Array.isArray(inbox)) inbox = [];

        const newMsg = {
            id: 'MSG-' + Math.floor(10000 + Math.random() * 90000),
            username: buyerUser,
            contact: contact || buyerUser,
            orderId: orderId || ('#ORD-' + Math.floor(10000 + Math.random() * 90000)),
            title: title || 'Order Update',
            body: body || 'Your order status has been updated.',
            key: key || null,
            date: new Date().toLocaleString(),
            read: false
        };

        inbox.unshift(newMsg);
        writeJSON(INBOX_FILE, inbox);
        console.log(`[+] Inbox message sent to @${buyerUser}`);
        res.json({ success: true, message: newMsg });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/inbox/:username', (req, res) => {
    try {
        const rawUser = req.params.username || '';
        const cleanUser = rawUser.trim().toLowerCase().replace(/^@/, '').split('#')[0];
        let inbox = readJSON(INBOX_FILE);
        if (!Array.isArray(inbox)) inbox = [];

        inbox = inbox.filter(m => {
            const u = (m.username || m.contact || '').toString().toLowerCase().replace(/^@/, '').split('#')[0];
            return u !== cleanUser;
        });

        writeJSON(INBOX_FILE, inbox);
        res.json({ success: true, message: `Inbox cleared for @${rawUser}` });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
// 🔄 4. API: SUBMIT HWID RESET ORDER (RS. 200 WITH PAYMENT SLIP)
// =========================================================================
app.post(['/api/hwid/request', '/api/hwid-reset'], upload.single('slip'), async (req, res) => {
    try {
        const { discordUsername, discordUser, contact, key, licenseKey, amount, username } = req.body;
        const buyerUser = (discordUsername || discordUser || contact || username || '').toString().replace(/^@/, '').trim();
        const accountUser = (username || buyerUser).toString().replace(/^@/, '').trim();
        const targetKey = (key || licenseKey || '').toString().trim().toUpperCase();
        const payAmount = amount || 'Rs. 200 LKR';

        if (!buyerUser || !targetKey) {
            return res.status(400).json({ error: 'Discord Username and License Key are required for HWID Reset Order.' });
        }

        let slipFile = null;
        let slipUrl = '';
        if (req.file) {
            slipFile = req.file.filename;
            slipUrl = `/uploads/${req.file.filename}`;
        }

        const reqId = '#HWID-' + Math.floor(10000 + Math.random() * 90000);
        const hwidRecord = {
            id: reqId,
            buyer: buyerUser,
            username: accountUser,
            discord: buyerUser,
            contact: buyerUser,
            key: targetKey,
            amount: payAmount,
            slipFile: slipFile,
            slipUrl: slipUrl,
            status: 'PENDING',
            date: new Date().toLocaleString()
        };

        let requests = readJSON(HWID_FILE);
        if (!Array.isArray(requests)) requests = [];
        requests.unshift(hwidRecord);
        writeJSON(HWID_FILE, requests);
        console.log(`[+] HWID Reset Order submitted: ${reqId} for @${buyerUser} (Rs. 200 Slip: ${slipFile || 'None'})`);

        // Forward HWID Reset order & payment slip attachment to Discord Webhook
        (async () => {
            try {
                const siteUrl = process.env.WEBSITE_URL || 'http://localhost:5000';
                const embedObj = {
                    title: `🔄 NEW HWID RESET ORDER (${reqId})`,
                    color: 0xf59e0b, // Amber Gold
                    description: `Customer **@${buyerUser}** requested HWID Reset for License Key \`${targetKey}\`.\n\n**Fee:** ${payAmount}\n**Status:** ⌛ **PENDING REVIEW**\n**Store URL:** [Open Store](${siteUrl})`,
                    fields: [
                        { name: "👤 Buyer Discord", value: `\`@${buyerUser}\``, inline: true },
                        { name: "🔑 License Key", value: `\`${targetKey}\``, inline: true },
                        { name: "💵 Fee Amount", value: payAmount, inline: true },
                        { name: "📍 Channel", value: `<#${HWID_CHANNEL_ID}>`, inline: true }
                    ],
                    footer: { text: "LUKZI GANG HWID Protection System" },
                    timestamp: new Date().toISOString()
                };

                const payloadContent = `🔄 **NEW HWID RESET ORDER FOR @${buyerUser} (Rs. 200)**\n📍 Channel: <#${HWID_CHANNEL_ID}>`;

                if (req.file) {
                    embedObj.image = { url: "attachment://payment_slip.png" };
                    const fileBlob = new Blob([fs.readFileSync(req.file.path)]);
                    const formData = new FormData();
                    formData.append('payload_json', JSON.stringify({
                        username: "LUKZI GANG HWID BOT",
                        avatar_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200",
                        content: payloadContent,
                        embeds: [embedObj]
                    }));
                    formData.append('file', fileBlob, 'payment_slip.png');

                    await fetch(HWID_WEBHOOK_URL, { method: 'POST', body: formData });
                } else {
                    await fetch(HWID_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: "LUKZI GANG HWID BOT",
                            avatar_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200",
                            content: payloadContent,
                            embeds: [embedObj]
                        })
                    });
                }
            } catch(webErr) {
                console.error("HWID webhook forward error:", webErr.message);
            }
        })();

        return res.json({ success: true, requestId: reqId, record: hwidRecord });
    } catch(err) {
        return res.status(500).json({ error: err.message });
    }
});

// GET All HWID Reset Requests
app.get(['/api/hwid-requests', '/api/hwid'], (req, res) => {
    let requests = readJSON(HWID_FILE);
    if (!Array.isArray(requests)) requests = [];
    res.json({ success: true, count: requests.length, requests });
});

// Approve HWID Reset Order & Send DM Notice
app.post(['/api/hwid-requests/:id/approve', '/api/hwid/:id/approve'], async (req, res) => {
    try {
        const reqId = req.params.id;
        let requests = readJSON(HWID_FILE);
        if (!Array.isArray(requests)) requests = [];

        const cleanId = reqId.replace(/^#/, '').trim();
        const record = requests.find(r => r.id === reqId || r.id === '#' + cleanId || (r.id && r.id.replace('#', '') === cleanId));
        if (!record) {
            return res.status(404).json({ error: 'HWID request not found' });
        }

        record.status = 'RESET';
        writeJSON(HWID_FILE, requests);

        const buyerUser = (record.buyer || record.discord || record.contact || record.username || 'Customer').replace(/^@/, '').trim();
        const targetKey = record.key || record.license || 'VIP-KEY';

        // Cross-reference users.json to resolve both website account username and discord handle
        let users = readJSON(USERS_FILE);
        let matchedUser = null;
        if (Array.isArray(users)) {
            const cleanB = buyerUser.toLowerCase().split('#')[0];
            matchedUser = users.find(u => 
                (u.username && u.username.toLowerCase() === cleanB) ||
                (u.discord && u.discord.toLowerCase().replace(/^@/, '').split('#')[0] === cleanB) ||
                (u.contact && u.contact.toLowerCase().replace(/^@/, '').split('#')[0] === cleanB) ||
                (u.email && u.email.toLowerCase() === cleanB)
            );
        }

        const accountUsername = matchedUser ? matchedUser.username : buyerUser;
        const discordHandle = matchedUser ? (matchedUser.discord || buyerUser) : buyerUser;

        // Add confirmation message to Customer Inbox
        try {
            let inboxList = readJSON(INBOX_FILE);
            if (!Array.isArray(inboxList)) inboxList = [];

            // Remove any older message for this same HWID order ID
            inboxList = inboxList.filter(m => m.orderId !== record.id);

            const newMsg = {
                id: 'MSG-HWID-' + Math.floor(10000 + Math.random() * 90000),
                username: accountUsername,
                contact: discordHandle,
                buyer: buyerUser,
                orderId: record.id,
                title: `🔄 HWID RESET APPROVED & UNLINKED (${record.id})`,
                body: `✅ YOUR HWID HAS BEEN RESET SUCCESSFULLY!\n\nHello @${buyerUser}!\nYour HWID Reset Request (${record.id}) has been verified and APPROVED by Store Admin.\n\n🔑 Reset License Key: ${targetKey}\n💻 Status: UNLINKED & READY FOR NEW PC\n⏰ Reset Date: ${new Date().toLocaleString()}\n\nYour hardware ID (HWID) binding has been completely cleared. You can now login on your new PC or new Windows installation with this license key without any restrictions.`,
                key: targetKey,
                licenseKey: targetKey,
                isHwid: true,
                product: 'HWID RESET SERVICE',
                date: new Date().toLocaleString(),
                read: false
            };

            inboxList.unshift(newMsg);
            writeJSON(INBOX_FILE, inboxList);
            console.log(`[📩 INBOX] HWID Reset approval dispatched to @${accountUsername} / @${discordHandle} for order ${record.id}`);
        } catch(e) {
            console.error("Inbox write error on HWID approve:", e.message);
        }

        // Send Discord DM to customer
        try {
            fetch('http://localhost:3001/api/send-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: buyerUser,
                    product: 'HWID RESET SERVICE (Rs. 200)',
                    licenseKey: targetKey,
                    orderId: record.id
                })
            }).catch(() => {});
        } catch(e) {}

        console.log(`[+] HWID Reset Order ${record.id} approved & unlinked for @${buyerUser}`);
        return res.json({ success: true, message: `HWID reset approved for @${buyerUser}`, record });
    } catch(err) {
        return res.status(500).json({ error: err.message });
    }
});

// Delete HWID Reset Request
app.delete(['/api/hwid-requests/:id', '/api/hwid/:id'], (req, res) => {
    try {
        const reqId = req.params.id;
        const cleanId = reqId.replace(/^#/, '').trim();
        let requests = readJSON(HWID_FILE);
        if (!Array.isArray(requests)) requests = [];

        requests = requests.filter(r => r.id !== reqId && r.id !== '#' + cleanId && (r.id && r.id.replace('#', '') !== cleanId));
        writeJSON(HWID_FILE, requests);
        res.json({ success: true, count: requests.length });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

const os = require('os');

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}


// =========================================================================
// 🛠️ STORE CONFIGURATION API (PRICES, ANNOUNCEMENT, WALLET)
// =========================================================================
const STORE_CONFIG_FILE = path.join(__dirname, 'data', 'store_config.json');

// (Unified routes for /api/config & /api/store-config with 24-hour announcement auto-expiry defined below)

// =========================================================================
// 💬 6. FEEDBACKS & VOUCHES API
// =========================================================================
app.get('/api/feedbacks', (req, res) => {
    let feedbacks = readJSON(FEEDBACKS_FILE);
    if (!Array.isArray(feedbacks)) {
        feedbacks = [];
        writeJSON(FEEDBACKS_FILE, feedbacks);
    }
    res.json({ success: true, count: feedbacks.length, feedbacks });
});

app.post('/api/feedbacks', upload.single('proofFile'), (req, res) => {
    try {
        const { username, product, rating, message, orderId, amount } = req.body;
        if (!username || !message) {
            return res.status(400).json({ error: 'Username and message are required' });
        }

        let proofImg = req.body.proofImg || req.body.image;
        if (req.file) {
            proofImg = `/uploads/${req.file.filename}`;
        }
        if (!proofImg || proofImg === 'Screenshot_37.png') {
            proofImg = req.file ? `/uploads/${req.file.filename}` : 'internal_panel.jpg';
        }

        let feedbacks = readJSON(FEEDBACKS_FILE);
        if (!Array.isArray(feedbacks)) feedbacks = [];

        const newFeedback = {
            id: 'VOUCH-' + Math.floor(1000 + Math.random() * 9000),
            orderId: orderId || ('#ORD-' + Math.floor(10000 + Math.random() * 90000)),
            username: username.trim(),
            product: product || 'INTERNAL PANEL V4',
            amount: amount || '$24.99 USD',
            rating: parseInt(rating) || 5,
            message: message.trim(),
            proofImg: proofImg,
            time: 'Just Now',
            date: new Date().toLocaleString(),
            status: 'COMMUNITY VERIFIED VOUCH'
        };

        feedbacks.unshift(newFeedback);
        writeJSON(FEEDBACKS_FILE, feedbacks);
        console.log(`[+] New feedback created by ${username} (Proof Img: ${newFeedback.proofImg})`);
        res.json({ success: true, feedback: newFeedback });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/feedbacks/:id', (req, res) => {
    try {
        const fid = req.params.id;
        let feedbacks = readJSON(FEEDBACKS_FILE);
        feedbacks = feedbacks.filter(f => f.id !== fid && f.orderId !== fid);
        writeJSON(FEEDBACKS_FILE, feedbacks);
        console.log(`[-] Feedback ${fid} removed`);
        res.json({ success: true, message: 'Feedback removed' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
// 🎫 7. REDEEM CODE GENERATOR & VALIDATION API
// =========================================================================
app.get('/api/redeem-codes', (req, res) => {
    let codes = readJSON(REDEEM_CODES_FILE);
    if (!Array.isArray(codes) || codes.length === 0) {
        codes = [
            {
                id: "KEY-101",
                code: "LUKZI-VIP-7781-X9",
                role: "VIP UNLIMITED",
                duration: "30 Days",
                status: "ACTIVE",
                createdAt: new Date().toLocaleString(),
                redeemedBy: null
            },
            {
                id: "KEY-102",
                code: "LUKZI-INTERNAL-5520-B2",
                role: "INTERNAL PANEL V4",
                duration: "30 Days",
                status: "ACTIVE",
                createdAt: new Date().toLocaleString(),
                redeemedBy: null
            },
            {
                id: "KEY-103",
                code: "LUKZI-ESP-3391-C8",
                role: "ESP PANEL V3.0",
                duration: "7 Days",
                status: "ACTIVE",
                createdAt: new Date().toLocaleString(),
                redeemedBy: null
            }
        ];
        writeJSON(REDEEM_CODES_FILE, codes);
    }
    res.json({ success: true, count: codes.length, codes });
});

// Helper for key normalization (ignores case, spaces, hyphens, underscores)
const normalizeKey = str => (str || '').toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

// Check/Verify License Key status without burning it
app.get('/api/redeem-codes/check/:code', (req, res) => {
    try {
        const targetNorm = normalizeKey(req.params.code);
        if (!targetNorm) {
            return res.status(400).json({ valid: false, error: 'Code is required' });
        }

        let codes = readJSON(REDEEM_CODES_FILE);
        if (!Array.isArray(codes)) codes = [];

        let found = codes.find(c => normalizeKey(c.code) === targetNorm);

        // Fallback 1: Orders file
        if (!found) {
            const orders = readJSON(ORDERS_FILE);
            if (Array.isArray(orders)) {
                const matchedOrder = orders.find(o => normalizeKey(o.key) === targetNorm);
                if (matchedOrder) {
                    found = {
                        code: matchedOrder.key,
                        role: matchedOrder.product || 'VIP UNLIMITED',
                        duration: matchedOrder.duration || '30 Days',
                        status: 'ACTIVE'
                    };
                }
            }
        }

        // Fallback 2: Stock inventory file
        if (!found) {
            const keyStock = readJSON(KEYS_STOCK_FILE);
            if (Array.isArray(keyStock)) {
                const matchedStock = keyStock.find(k => normalizeKey(k.key) === targetNorm);
                if (matchedStock) {
                    found = {
                        code: matchedStock.key,
                        role: matchedStock.role || 'VIP UNLIMITED',
                        duration: matchedStock.duration || '30 Days',
                        status: matchedStock.status === 'UNUSED' ? 'ACTIVE' : matchedStock.status
                    };
                }
            }
        }

        if (!found) {
            return res.status(404).json({ valid: false, error: 'Invalid license key' });
        }

        res.json({
            valid: found.status === 'ACTIVE',
            status: found.status,
            role: found.role,
            duration: found.duration,
            code: found.code
        });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/redeem-codes/generate', (req, res) => {
    try {
        const { prefix, role, duration, count } = req.body;
        const codePrefix = (prefix || 'LUKZI').trim().toUpperCase();
        const targetRole = role || 'VIP UNLIMITED';
        const keyDuration = duration || '30 Days';
        const quantity = Math.min(Math.max(parseInt(count) || 1, 1), 50);

        let codes = readJSON(REDEEM_CODES_FILE);
        if (!Array.isArray(codes)) codes = [];
        const generatedList = [];

        for (let i = 0; i < quantity; i++) {
            const randPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
            const randPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
            const roleSlug = targetRole.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
            const finalCode = `${codePrefix}-${roleSlug}-${randPart1}-${randPart2}`;

            const newCodeObj = {
                id: 'KEY-' + Math.floor(10000 + Math.random() * 90000),
                code: finalCode,
                role: targetRole,
                duration: keyDuration,
                status: 'ACTIVE',
                createdAt: new Date().toLocaleString(),
                redeemedBy: null
            };

            codes.unshift(newCodeObj);
            generatedList.push(newCodeObj);
        }

        writeJSON(REDEEM_CODES_FILE, codes);

        // 📩 Automatically dispatch generated keys into INBOX_FILE
        try {
            let inboxList = readJSON(INBOX_FILE);
            if (!Array.isArray(inboxList)) inboxList = [];

            const targetUser = (req.body.targetUser || req.body.username || '*').trim();

            generatedList.forEach(codeObj => {
                const inboxMsg = {
                    id: 'MSG-' + Math.floor(10000 + Math.random() * 90000),
                    username: targetUser,
                    targetUser: targetUser,
                    title: `🎁 NEW VIP REDEEM CODE: ${codeObj.role || 'VIP PASS'}`,
                    body: `A new VIP software redeem key (${codeObj.duration || '30 Days'}) is generated and ready for use! Click REDEEM NOW to activate software access.`,
                    key: codeObj.code,
                    product: codeObj.role || 'VIP PASS',
                    duration: codeObj.duration || '30 Days',
                    date: new Date().toLocaleString(),
                    read: false
                };
                inboxList.unshift(inboxMsg);
            });
            writeJSON(INBOX_FILE, inboxList);
        } catch(inboxErr) {
            console.error("Inbox dispatch error during redeem code generation:", inboxErr.message);
        }

        console.log(`[+] Generated ${quantity} new redeem keys (Role: ${targetRole}) and dispatched to Inbox`);
        res.json({ success: true, count: quantity, generated: generatedList });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/redeem-codes/redeem', (req, res) => {
    try {
        const rawCode = req.body.code || req.body.key;
        const rawUser = req.body.user || req.body.username || req.body.buyer || 'Customer';
        const clientIp = req.ip || req.headers['x-forwarded-for'] || '';

        if (isUserBanned(rawUser, '', clientIp)) {
            return res.status(403).json({ error: '🚫 YOUR ACCOUNT HAS BEEN BANNED BY STORE ADMIN!' });
        }

        if (!rawCode || !rawCode.toString().trim()) {
            return res.status(400).json({ error: 'Redeem code is required' });
        }

        const targetNorm = normalizeKey(rawCode);
        const currentUser = rawUser.toString().trim();

        let codes = readJSON(REDEEM_CODES_FILE);
        if (!Array.isArray(codes)) codes = [];

        // 1. Search in redeem codes vault (Store Redeem Codes)
        let found = codes.find(c => normalizeKey(c.code) === targetNorm);

        // 2. Fallback: Search in orders vault for approved Store Redeem Codes
        if (!found) {
            let orders = readJSON(ORDERS_FILE);
            if (Array.isArray(orders)) {
                const matchedOrderRedeem = orders.find(o => o.redeemCode && normalizeKey(o.redeemCode) === targetNorm);
                if (matchedOrderRedeem) {
                    found = {
                        id: 'KEY-' + Math.floor(10000 + Math.random() * 90000),
                        code: matchedOrderRedeem.redeemCode,
                        role: matchedOrderRedeem.product || 'VIP UNLIMITED',
                        duration: matchedOrderRedeem.duration || '30 Days',
                        status: 'ACTIVE',
                        createdAt: matchedOrderRedeem.date || new Date().toLocaleString(),
                        redeemedBy: null
                    };
                    codes.unshift(found);
                } else {
                    // Check if user accidentally entered a Software License Key on the website
                    const matchedOrderKey = orders.find(o => o.key && normalizeKey(o.key) === targetNorm);
                    if (matchedOrderKey) {
                        return res.status(400).json({ error: '🔑 This is a Software License Key for tool panel login! Please use your Store Redeem Code to activate website access.' });
                    }
                }
            }
        }

        // 3. Fallback: Search in stock inventory vault (data/keys_stock.json)
        if (!found) {
            let keyStock = readJSON(KEYS_STOCK_FILE);
            if (Array.isArray(keyStock)) {
                const matchedStock = keyStock.find(k => normalizeKey(k.key) === targetNorm);
                if (matchedStock) {
                    found = {
                        id: matchedStock.id || ('KEY-' + Math.floor(10000 + Math.random() * 90000)),
                        code: matchedStock.key,
                        role: matchedStock.role || 'VIP UNLIMITED',
                        duration: matchedStock.duration || '30 Days',
                        status: 'ACTIVE',
                        createdAt: matchedStock.addedAt || new Date().toLocaleString(),
                        redeemedBy: null
                    };
                    // Mark stock key USED
                    matchedStock.status = 'USED';
                    matchedStock.assignedToDiscord = currentUser;
                    matchedStock.assignedAt = new Date().toLocaleString();
                    writeJSON(KEYS_STOCK_FILE, keyStock);
                    codes.unshift(found);
                }
            }
        }

        if (!found) {
            return res.status(404).json({ error: 'Invalid store redeem code. Please check your code and try again.' });
        }

        // 4. Handle already redeemed keys
        if (found.status === 'REDEEMED' || found.status === 'USED') {
            if (currentUser && currentUser !== 'Customer' && found.redeemedBy && found.redeemedBy.toLowerCase() === currentUser.toLowerCase()) {
                return res.json({
                    success: true,
                    alreadyActive: true,
                    message: `License key already active for @${found.redeemedBy}! Unlocked: ${found.role} (${found.duration})`,
                    role: found.role,
                    duration: found.duration,
                    code: found.code
                });
            }
            return res.status(400).json({ error: `This key was already redeemed on ${found.redeemedAt || 'earlier'} by @${found.redeemedBy || 'another user'}.` });
        }

        if (found.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'This license key is no longer active.' });
        }

        found.status = 'REDEEMED';
        found.redeemedBy = currentUser;
        found.redeemedAt = new Date().toLocaleString();
        writeJSON(REDEEM_CODES_FILE, codes);

        console.log(`[+] Key ${found.code} successfully redeemed by ${currentUser}`);
        res.json({
            success: true,
            message: `Key activated successfully! Unlocked: ${found.role} (${found.duration})`,
            role: found.role,
            duration: found.duration,
            code: found.code
        });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/redeem-codes/:id', (req, res) => {
    try {
        const keyId = req.params.id;
        let codes = readJSON(REDEEM_CODES_FILE);
        if (!Array.isArray(codes)) codes = [];
        codes = codes.filter(c => c.id !== keyId && c.code !== keyId);
        writeJSON(REDEEM_CODES_FILE, codes);
        console.log(`[-] Key ${keyId} revoked`);
        res.json({ success: true, message: 'Key revoked and deleted' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
// 🔑 8. LICENSE KEY STOCK INVENTORY API
// =========================================================================
app.get('/api/keys-stock', (req, res) => {
    try {
        let keysStock = readJSON(KEYS_STOCK_FILE);
        if (!Array.isArray(keysStock)) keysStock = [];

        // Compute summary counts per role
        const summary = {
            'INTERNAL PANEL V4': 0,
            'ESP PANEL V3.0': 0,
            'EXTERNAL PANEL V2.5': 0,
            'MOUSEBOT AI V1.7': 0,
            'UID BYPASS V2.0': 0,
            'VIP UNLIMITED': 0
        };

        keysStock.forEach(k => {
            if (k.status === 'UNUSED') {
                const r = (k.role || '').toUpperCase();
                if (r.includes('INTERNAL')) summary['INTERNAL PANEL V4']++;
                else if (r.includes('ESP')) summary['ESP PANEL V3.0']++;
                else if (r.includes('EXTERNAL')) summary['EXTERNAL PANEL V2.5']++;
                else if (r.includes('MOUSE')) summary['MOUSEBOT AI V1.7']++;
                else if (r.includes('UID')) summary['UID BYPASS V2.0']++;
                else summary['VIP UNLIMITED']++;
            }
        });

        res.json({ success: true, count: keysStock.length, summary, keys: keysStock });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/keys-stock/add', (req, res) => {
    try {
        const { role, duration, keysText } = req.body;
        if (!role || !keysText) {
            return res.status(400).json({ error: 'role and keysText are required.' });
        }

        let keyStock = readJSON(KEYS_STOCK_FILE);
        if (!Array.isArray(keyStock)) keyStock = [];

        const keyLines = keysText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let addedCount = 0;

        keyLines.forEach(kStr => {
            const cleanK = kStr.replace(/\s+/g, '').toUpperCase();
            if (!keyStock.some(item => (item.key || '').toUpperCase() === cleanK)) {
                keyStock.unshift({
                    id: 'STOCK-' + Math.floor(100000 + Math.random() * 900000),
                    key: cleanK,
                    role: role,
                    duration: duration || '30 Days',
                    status: 'UNUSED',
                    addedAt: new Date().toLocaleString(),
                    assignedToOrder: null,
                    assignedToDiscord: null,
                    assignedAt: null
                });
                addedCount++;
            }
        });

        writeJSON(KEYS_STOCK_FILE, keyStock);
        console.log(`[+] Added ${addedCount} new stock keys for role: ${role}`);
        res.json({ success: true, addedCount, totalStock: keyStock.length });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/keys-stock/:id', (req, res) => {
    try {
        const keyId = req.params.id;
        let keyStock = readJSON(KEYS_STOCK_FILE);
        if (!Array.isArray(keyStock)) keyStock = [];

        keyStock = keyStock.filter(item => item.id !== keyId && item.key !== keyId);
        writeJSON(KEYS_STOCK_FILE, keyStock);
        console.log(`[-] Stock key ${keyId} removed`);
        res.json({ success: true, message: 'Stock key deleted' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
// 🚫 BANNED USERS & REGISTERED ACCOUNTS MANAGEMENT APIS
// =========================================================================
app.get('/api/users', (req, res) => {
    try {
        let users = readJSON(USERS_FILE);
        if (!Array.isArray(users)) users = [];
        const safeUsers = users.map(({ passwordHash, salt, password, ...u }) => u);
        res.json({ success: true, count: safeUsers.length, users: safeUsers });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/banned', (req, res) => {
    let banned = readJSON(BANNED_USERS_FILE);
    if (!Array.isArray(banned)) banned = [];
    res.json({ success: true, count: banned.length, banned });
});

app.post('/api/users/ban', (req, res) => {
    try {
        const { username, email, ip, reason } = req.body;
        const cleanUser = (username || '').toString().trim().replace(/^@/, '');
        const cleanEmail = (email || '').toString().trim().toLowerCase();
        const clientIp = (ip || req.ip || req.headers['x-forwarded-for'] || '').toString().trim();

        if (!cleanUser && !cleanEmail && !clientIp) {
            return res.status(400).json({ error: 'Username, Email, or IP required to ban user.' });
        }

        let banned = readJSON(BANNED_USERS_FILE);
        if (!Array.isArray(banned)) banned = [];

        const existing = banned.find(b => 
            (cleanUser && (b.username || '').toLowerCase() === cleanUser.toLowerCase()) ||
            (cleanEmail && (b.email || '').toLowerCase() === cleanEmail)
        );

        if (!existing) {
            const banRecord = {
                id: 'BAN-' + Math.floor(10000 + Math.random() * 90000),
                username: cleanUser,
                email: cleanEmail,
                ip: clientIp,
                reason: reason || 'Banned by Store Admin',
                bannedAt: new Date().toLocaleString()
            };
            banned.unshift(banRecord);
            writeJSON(BANNED_USERS_FILE, banned);
            console.log(`[🚫] BANNED USER: @${cleanUser || cleanEmail || clientIp}`);
            res.json({ success: true, message: `User @${cleanUser || cleanEmail} has been banned!`, ban: banRecord });
        } else {
            res.json({ success: true, message: `User @${cleanUser || cleanEmail} is already banned.`, ban: existing });
        }
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/ban/:username', (req, res) => {
    try {
        const target = (req.params.username || '').toString().trim().toLowerCase().replace(/^@/, '');
        let banned = readJSON(BANNED_USERS_FILE);
        if (!Array.isArray(banned)) banned = [];

        const beforeCount = banned.length;
        banned = banned.filter(b => (b.username || '').toLowerCase() !== target && (b.email || '').toLowerCase() !== target);
        writeJSON(BANNED_USERS_FILE, banned);

        console.log(`[✅] UNBANNED USER: @${target}`);
        res.json({ success: true, unbanned: beforeCount - banned.length, message: `Unbanned user @${target}` });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================================================================
// ⚙️ STORE CONFIGURATION & ANNOUNCEMENT 24-HOUR AUTO-EXPIRY ENGINE
// =========================================================================
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 Hours in milliseconds (1 Day)

/**
 * Checks if the store announcement has exceeded 24 hours.
 * If expired, automatically clears it from configuration and returns true.
 */
function checkAndPruneExpiredAnnouncement(config) {
    if (!config || !config.announcement || typeof config.announcement !== 'string' || !config.announcement.trim()) {
        return false;
    }

    const now = Date.now();
    const createdAt = Number(config.announcementCreatedAt);
    const expiresAt = Number(config.announcementExpiresAt);

    let isExpired = false;
    if (expiresAt && now >= expiresAt) {
        isExpired = true;
    } else if (createdAt && (now - createdAt) >= ONE_DAY_MS) {
        isExpired = true;
    }

    if (isExpired) {
        console.log(`[⏰ ANNOUNCEMENT AUTO-EXPIRED] Announcement "${config.announcement}" passed 24h limit. Auto-clearing from store.`);
        config.announcement = '';
        delete config.announcementCreatedAt;
        delete config.announcementExpiresAt;
        return true;
    }
    return false;
}

// Background auto-expiry pruner (runs every 5 minutes to ensure auto-cleanup)
setInterval(() => {
    try {
        let config = readJSON(STORE_CONFIG_FILE);
        if (config && checkAndPruneExpiredAnnouncement(config)) {
            writeJSON(STORE_CONFIG_FILE, config);
            console.log('[⏰ AUTO-PRUNER] Store announcement pruned and database synced.');
        }
    } catch(err) {
        // silent
    }
}, 5 * 60 * 1000);

app.get(['/api/store-config', '/api/config', '/api/announcement'], (req, res) => {
    try {
        let config = readJSON(STORE_CONFIG_FILE);
        if (!config || typeof config !== 'object' || Array.isArray(config)) {
            config = { announcement: '', walletAddress: '', products: [], downloadLinks: {} };
        }

        // Check and prune if announcement has expired past 24 hours
        if (checkAndPruneExpiredAnnouncement(config)) {
            writeJSON(STORE_CONFIG_FILE, config);
        }

        res.json({ success: true, config, ...config });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.post(['/api/store-config', '/api/config', '/api/announcement'], (req, res) => {
    try {
        const { announcement, announcementTarget, walletAddress, bankDetails, ezCashDetails, products, downloadLinks } = req.body;
        let config = readJSON(STORE_CONFIG_FILE);
        if (!config || typeof config !== 'object' || Array.isArray(config)) {
            config = {};
        }

        if (announcement !== undefined) {
            const cleanAnn = (announcement || '').trim();
            config.announcement = cleanAnn;
            if (cleanAnn) {
                // Auto-expire in exactly 1 day (24 hours)
                config.announcementCreatedAt = Date.now();
                config.announcementExpiresAt = Date.now() + ONE_DAY_MS;
                console.log(`[📢 ANNOUNCEMENT SET] "${cleanAnn}" (Auto-expires in 24h at ${new Date(config.announcementExpiresAt).toLocaleString()})`);
            } else {
                delete config.announcementCreatedAt;
                delete config.announcementExpiresAt;
                console.log('[📢 ANNOUNCEMENT CLEARED]');
            }
        }
        if (announcementTarget !== undefined) config.announcementTarget = announcementTarget;
        if (walletAddress !== undefined) config.walletAddress = walletAddress;
        if (bankDetails !== undefined) config.bankDetails = bankDetails;
        if (ezCashDetails !== undefined) config.ezCashDetails = ezCashDetails;
        if (products && Array.isArray(products)) {
            config.products = products;
            if (!config.downloadLinks) config.downloadLinks = {};
            products.forEach(p => {
                if (p && p.name && p.downloadUrl) {
                    config.downloadLinks[p.name] = p.downloadUrl;
                    const u = (p.name || '').toUpperCase();
                    if (u.includes('INTERNAL')) {
                        config.downloadLinks['INTERNAL PANEL'] = p.downloadUrl;
                        config.downloadLinks['INTERNAL PANEL V4'] = p.downloadUrl;
                    } else if (u.includes('MOUSE')) {
                        config.downloadLinks['MOUSEBOT AI'] = p.downloadUrl;
                        config.downloadLinks['MOUSEBOT AI V1.7'] = p.downloadUrl;
                    } else if (u.includes('UID') || u.includes('BYPASS')) {
                        config.downloadLinks['UID BYPASS'] = p.downloadUrl;
                        config.downloadLinks['UID BYPASS V2.0'] = p.downloadUrl;
                    } else if (u.includes('VPN')) {
                        config.downloadLinks['CYBER VPN PRO'] = p.downloadUrl;
                    } else if (u.includes('DISCORD')) {
                        config.downloadLinks['DISCORD CHANNEL'] = p.downloadUrl;
                    } else if (u.includes('MOBILE')) {
                        config.downloadLinks['MOBILE PANELS'] = p.downloadUrl;
                    }
                }
            });
        }
        if (downloadLinks && typeof downloadLinks === 'object') {
            config.downloadLinks = { ...(config.downloadLinks || {}), ...downloadLinks };
            if (Array.isArray(config.products)) {
                config.products.forEach(p => {
                    const match = config.downloadLinks[p.name] || config.downloadLinks[p.id];
                    if (match) p.downloadUrl = match;
                });
            }
        }

        writeJSON(STORE_CONFIG_FILE, config);
        console.log('[⚙️] Store configuration, download links & product cards saved successfully');
        res.json({ 
            success: true, 
            message: 'Store configuration and announcement saved with 24-hour auto-expiry!', 
            config 
        });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// 📥 REAL-TIME DYNAMIC DOWNLOAD LINK RESOLVER (Always reads freshest URL directly from disk)
app.get(['/api/download/:toolId', '/download/:toolId', '/api/download'], (req, res) => {
    try {
        const rawTool = (req.params.toolId || req.query.tool || req.query.id || req.query.product || '').trim();
        const toolId = rawTool.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const config = readJSON(STORE_CONFIG_FILE) || {};
        const links = config.downloadLinks || {};
        const products = Array.isArray(config.products) ? config.products : [];

        let targetUrl = null;

        // 1. Direct match in downloadLinks
        if (rawTool && links[rawTool]) {
            targetUrl = links[rawTool];
        }

        // 2. Match in products array
        if (!targetUrl && toolId) {
            for (const p of products) {
                const pNameClean = (p.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                const pIdClean = (p.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (pNameClean === toolId || pIdClean === toolId || pNameClean.includes(toolId) || toolId.includes(pNameClean)) {
                    targetUrl = p.downloadUrl || links[p.name] || links[p.id];
                    if (targetUrl) break;
                }
            }
        }

        // 3. Fuzzy search in downloadLinks keys
        if (!targetUrl && toolId) {
            for (const [key, url] of Object.entries(links)) {
                if (!url) continue;
                const kClean = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (kClean === toolId || kClean.includes(toolId) || toolId.includes(kClean)) {
                    targetUrl = url;
                    break;
                }
            }
        }

        // 4. Keyword fallbacks
        if (!targetUrl && toolId) {
            if (toolId.includes('INTERNAL')) targetUrl = links['INTERNAL PANEL'] || links['INTERNAL PANEL V4'];
            else if (toolId.includes('MOUSE')) targetUrl = links['MOUSEBOT AI'] || links['MOUSEBOT AI V1.7'];
            else if (toolId.includes('UID') || toolId.includes('BYPASS')) targetUrl = links['UID BYPASS'] || links['UID BYPASS V2.0'];
            else if (toolId.includes('VPN')) targetUrl = links['CYBER VPN PRO'];
            else if (toolId.includes('MOBILE')) targetUrl = links['MOBILE PANELS'];
            else if (toolId.includes('DISCORD')) targetUrl = links['DISCORD QUEST PLUS'] || links['DISCORD CHANNEL'];
            else if (toolId.includes('ERROR') || toolId.includes('FIX')) targetUrl = links['ERRORS FIX TOOL'];
        }

        if (!targetUrl) {
            targetUrl = links['INTERNAL PANEL'] || 'https://www.mediafire.com';
        }

        if (req.xhr || req.headers.accept?.includes('application/json') || req.query.json === 'true') {
            return res.json({ success: true, tool: rawTool, downloadUrl: targetUrl });
        }

        console.log(`[📥 DOWNLOAD TRIGGERED] Tool: "${rawTool}" -> Redirecting to: ${targetUrl}`);
        return res.redirect(targetUrl);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// SPA Wildcard Route (Non-API requests serve storefront index.html or dashboard.html)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    if (req.path === '/dashboard' || req.path === '/admin') {
        return res.sendFile(path.join(__dirname, 'dashboard.html'));
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

const HOST = '0.0.0.0';

// Start Server on 0.0.0.0 Live Port with fallback port handler
const server = app.listen(PORT, HOST, () => {
    const localIp = getLocalIp();
    console.log("=======================================================");
    console.log(`🚀 LUKZI GANG STORE BACKEND IS LIVE ON PORT ${PORT}!`);
    console.log(`🏠 Localhost URL: http://localhost:${PORT}`);
    console.log(`📱 Live Net URL:  http://${localIp}:${PORT} (Access from Mobile on Wi-Fi)`);
    console.log(`🛒 Orders API:    http://localhost:${PORT}/api/orders`);
    console.log(`📁 Uploads Dir:   http://localhost:${PORT}/uploads/`);
    console.log("=======================================================");
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        const altPort = 5001;
        console.log(`[!] Port ${PORT} busy, starting on fallback port ${altPort}...`);
        app.listen(altPort, HOST, () => {
            console.log(`🚀 LUKZI GANG STORE BACKEND LIVE ON FALLBACK PORT ${altPort}!`);
            console.log(`🏠 Localhost URL: http://localhost:${altPort}`);
        });
    } else {
        console.error("Server listen error:", err);
    }
});
