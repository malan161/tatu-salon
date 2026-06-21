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

// Client messages — filter by clientId so each client sees only their own
app.get('/api/messages', (req, res) => {
  const msgs = readMessages();
  const clientId = req.query.clientId;
  if (clientId) {
    const filtered = msgs.filter(m => m.clientId === clientId);
    return res.json(filtered);
  }
  res.json([]);
});

// Admin messages — all messages, requires token
app.get('/api/admin/messages', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(readMessages());
});

// Admin messages by clientId
app.get('/api/admin/messages/:clientId', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const msgs = readMessages().filter(m => m.clientId === req.params.clientId);
  res.json(msgs);
});

const adminSockets = new Set();

io.on('connection', (socket) => {
  // Client registers with their clientId
  socket.on('register', (clientId) => {
    if (clientId) {
      socket.join('client:' + clientId);
    }
  });

  // Admin authenticates their socket
  socket.on('adminAuth', (token) => {
    if (adminTokens.has(token)) {
      adminSockets.add(socket.id);
      socket.join('admin');
      socket.emit('adminAuthResult', { success: true });
    } else {
      socket.emit('adminAuthResult', { success: false });
    }
  });

  socket.on('sendMessage', (data) => {
    const isAdmin = data.isAdmin && adminSockets.has(socket.id);

    if (data.isAdmin && !adminSockets.has(socket.id)) {
      return;
    }

    const msgs = readMessages();
    const newMsg = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      clientId: isAdmin ? data.clientId : (data.clientId || 'unknown'),
      name: data.name || 'Клиент',
      message: data.message,
      isAdmin: isAdmin ? 1 : 0,
      timestamp: new Date().toISOString()
    };
    msgs.push(newMsg);
    writeMessages(msgs);

    if (isAdmin) {
      // Admin reply — send only to that client and admin room
      io.to('client:' + data.clientId).emit('newMessage', newMsg);
      io.to('admin').emit('newMessage', newMsg);
    } else {
      // Client message — send to the client and all admins
      io.to('client:' + data.clientId).emit('newMessage', newMsg);
      io.to('admin').emit('newMessage', newMsg);
    }
  });

  socket.on('disconnect', () => {
    adminSockets.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Black Line server running on http://localhost:${PORT}`);
});
