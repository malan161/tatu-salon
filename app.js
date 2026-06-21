let socket;
try {
  socket = io();
} catch(e) {
  socket = { emit: function() {}, on: function() {} };
}

// DOM - Floating widget
const chatBtn = document.getElementById('chatBtn');
const chatWindow = document.getElementById('chatWindow');
const chatClose = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

// DOM - Section chat
const chatMessagesSection = document.getElementById('chatMessagesSection');
const chatInputSection = document.getElementById('chatInputSection');
const chatSendSection = document.getElementById('chatSendSection');

// DOM - Nav
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

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
  socket.emit('sendMessage', { name: 'Клиент', message: text, isAdmin: false });
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
  socket.emit('sendMessage', { name: 'Клиент', message: text, isAdmin: false });
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
    // Close all
    document.querySelectorAll('.faq-item').forEach(function(el) {
      el.classList.remove('active');
    });
    // Open clicked
    if (!isActive) {
      item.classList.add('active');
    }
  });
});

// INCOMING MESSAGES
socket.on('newMessage', renderToAll);

// LOAD HISTORY
fetch('/api/messages')
  .then(function(r) { return r.json(); })
  .then(function(msgs) {
    if (chatMessages) chatMessages.innerHTML = '';
    if (chatMessagesSection) chatMessagesSection.innerHTML = '';
    msgs.forEach(renderToAll);
  });
