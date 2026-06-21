function getClientId() {
  var id = sessionStorage.getItem('bl_client_id');
  if (!id) {
    id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('bl_client_id', id);
  }
  return id;
}

var clientId = getClientId();

var socket;
try {
  socket = io();
} catch(e) {
  socket = { emit: function() {}, on: function() {} };
}

// Register with server
socket.emit('register', clientId);

// DOM - Floating widget
var chatBtn = document.getElementById('chatBtn');
var chatWindow = document.getElementById('chatWindow');
var chatClose = document.getElementById('chatClose');
var chatMessages = document.getElementById('chatMessages');
var chatInput = document.getElementById('chatInput');
var chatSend = document.getElementById('chatSend');

// DOM - Section chat
var chatMessagesSection = document.getElementById('chatMessagesSection');
var chatInputSection = document.getElementById('chatInputSection');
var chatSendSection = document.getElementById('chatSendSection');

// DOM - Nav
var navToggle = document.getElementById('navToggle');
var navLinks = document.getElementById('navLinks');

// NAV TOGGLE
navToggle.addEventListener('click', function() {
  navLinks.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach(function(link) {
  link.addEventListener('click', function() {
    navLinks.classList.remove('active');
  });
});

// FLOATING CHAT TOGGLE
if (chatBtn) {
  chatBtn.addEventListener('click', function() {
    chatWindow.classList.toggle('active');
    if (chatWindow.classList.contains('active')) {
      chatInput.focus();
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });
}

if (chatClose) {
  chatClose.addEventListener('click', function() {
    chatWindow.classList.remove('active');
  });
}

// RENDER MESSAGE
function addMessage(data, container) {
  if (!container) return;
  var div = document.createElement('div');
  div.className = 'chat-msg ' + (data.isAdmin ? 'admin' : 'client');

  var nameDiv = document.createElement('div');
  nameDiv.className = 'msg-name';
  nameDiv.textContent = data.isAdmin ? 'Администратор' : data.name;

  var textDiv = document.createElement('div');
  textDiv.textContent = data.message;

  var timeDiv = document.createElement('div');
  timeDiv.className = 'msg-time';
  timeDiv.textContent = data.timestamp
    ? new Date(data.timestamp).toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : '';

  div.appendChild(nameDiv);
  div.appendChild(textDiv);
  div.appendChild(timeDiv);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function renderToAll(data) {
  addMessage(data, chatMessages);
  addMessage(data, chatMessagesSection);
}

// SEND MESSAGE (floating widget)
function sendMessage() {
  var text = chatInput.value.trim();
  if (!text) return;
  socket.emit('sendMessage', { name: 'Клиент', message: text, isAdmin: false, clientId: clientId });
  chatInput.value = '';
}

if (chatSend) {
  chatSend.addEventListener('click', sendMessage);
}
if (chatInput) {
  chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendMessage();
  });
}

// SEND MESSAGE (section)
function sendMessageSection() {
  var text = chatInputSection.value.trim();
  if (!text) return;
  socket.emit('sendMessage', { name: 'Клиент', message: text, isAdmin: false, clientId: clientId });
  chatInputSection.value = '';
}

if (chatSendSection) {
  chatSendSection.addEventListener('click', sendMessageSection);
}
if (chatInputSection) {
  chatInputSection.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendMessageSection();
  });
}

// FAQ ACCORDION
document.querySelectorAll('.faq-question').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var item = this.parentElement;
    var isActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(function(el) {
      el.classList.remove('active');
    });
    if (!isActive) {
      item.classList.add('active');
    }
  });
});

// INCOMING MESSAGES — only our own + admin replies come through
socket.on('newMessage', renderToAll);

// LOAD HISTORY — fetch only this client's messages
fetch('/api/messages?clientId=' + encodeURIComponent(clientId))
  .then(function(r) { return r.json(); })
  .then(function(msgs) {
    if (chatMessages) chatMessages.innerHTML = '';
    if (chatMessagesSection) chatMessagesSection.innerHTML = '';
    msgs.forEach(renderToAll);
  });
