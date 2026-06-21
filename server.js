require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DATA_FILE = path.join(__dirname, 'messages.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'blackline2024';
const adminTokens = new Set();

function readMessages() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeMessages(messages) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2), 'utf-8');
}

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname)));

// Admin login
app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(24).toString('hex');
    adminTokens.add(token);
    return res.json({ success: true, token });
  }
  res.status(401).json({ success: false, error: 'Неверный пароль' });
});

// Admin token verification
app.post('/api/admin/verify', (req, res) => {
  if (req.body.token && adminTokens.has(req.body.token)) {
    return res.json({ valid: true });
  }
  res.json({ valid: false });
});

app.get('/api/messages', (req, res) => {
  res.json(readMessages());
});

app.post('/api/messages', (req, res) => {
  const msgs = readMessages();
  const msg = {
    id: Date.now() + Math.random().toString(36).slice(2, 6),
    name: req.body.name || 'Клиент',
    message: req.body.message,
    isAdmin: req.body.isAdmin ? 1 : 0,
    timestamp: new Date().toISOString()
  };
  msgs.push(msg);
  writeMessages(msgs);
  res.json(msg);
});

// Track authenticated admin sockets
const adminSockets = new Set();

io.on('connection', (socket) => {
  // Admin authenticates their socket
  socket.on('adminAuth', (token) => {
    if (adminTokens.has(token)) {
      adminSockets.add(socket.id);
      socket.emit('adminAuthResult', { success: true });
    } else {
      socket.emit('adminAuthResult', { success: false });
    }
  });

  socket.on('sendMessage', (data) => {
    // Only allow admin messages from authenticated admin sockets
    if (data.isAdmin && !adminSockets.has(socket.id)) {
      return;
    }

    const msgs = readMessages();
    const newMsg = {
      id: Date.now() + Math.random().toString(36).slice(2, 6),
      name: data.name || 'Клиент',
      message: data.message,
      isAdmin: data.isAdmin ? 1 : 0,
      timestamp: new Date().toISOString()
    };
    msgs.push(newMsg);
    writeMessages(msgs);
    io.emit('newMessage', newMsg);
  });

  socket.on('disconnect', () => {
    adminSockets.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Black Line server running on http://localhost:${PORT}`);
});
