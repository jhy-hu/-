const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const personalitySelect = document.getElementById('personalitySelect');
const openSettingsButton = document.getElementById('openSettingsButton');
const openMemoryButton = document.getElementById('openMemoryButton');
const openInventoryButton = document.getElementById('openInventoryButton');
const openShopButton = document.getElementById('openShopButton');
const chatTitle = document.getElementById('chatTitle');
const chatSubtitle = document.getElementById('chatSubtitle');
const intimacyValue = document.getElementById('intimacyValue');
const relationshipStage = document.getElementById('relationshipStage');
const moodLabel = document.getElementById('moodLabel');
const chatPetAvatar = document.getElementById('chatPetAvatar');

function getPetImagePath(petAppearance, mood) {
  return `assets/pets/${petAppearance}/${mood}.png`;
}

function addMessageToUI(text, type) {
  const message = document.createElement('div');
  message.className = `message ${type}`;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addLoadingMessage() {
  const message = document.createElement('div');
  message.className = 'message pet-message';
  message.id = 'loading-message';
  message.textContent = '正在思考中...';
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeLoadingMessage() {
  const loading = document.getElementById('loading-message');
  if (loading) loading.remove();
}

function renderMessages(messages) {
  chatMessages.innerHTML = '';
  messages.forEach((msg) => {
    const type = msg.role === 'user' ? 'user-message' : 'pet-message';
    addMessageToUI(msg.content, type);
  });
}

async function loadPetAvatar() {
  const profile = await window.electronAPI.getUserProfile();
  const relationshipData = await window.electronAPI.getRelationshipData();

  const petAppearance = profile?.petAppearance || 'cat';
  const mood = relationshipData?.mood || 'normal';

  chatPetAvatar.src = getPetImagePath(petAppearance, mood);
  chatPetAvatar.onerror = () => {
    chatPetAvatar.src = getPetImagePath('cat', 'normal');
  };
}

async function loadProfileToUI() {
  const profile = await window.electronAPI.getUserProfile();
  if (!profile) return;

  chatTitle.textContent = profile.petName || '你的桌面宠物';
  chatSubtitle.textContent = profile.userNicknameByPet
    ? `今天也会陪着${profile.userNicknameByPet}`
    : '今天也陪着你';

  if (profile.personality) {
    personalitySelect.value = profile.personality;
  }
}

async function loadRelationshipToUI() {
  const data = await window.electronAPI.getRelationshipData();
  intimacyValue.textContent = data?.intimacy ?? 0;
  relationshipStage.textContent = data?.relationshipStage ?? '初识';
  moodLabel.textContent = data?.moodLabel ?? '普通';
}

async function loadChatHistory() {
  const history = await window.electronAPI.getChatHistory();
  if (history && history.messages) {
    renderMessages(history.messages);
  }
}

async function syncPersonalityToProfile() {
  const personality = personalitySelect.value;
  await window.electronAPI.updateUserPersonality(personality);
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const personality = personalitySelect.value;

  addMessageToUI(text, 'user-message');

  await window.electronAPI.appendChatMessage({
    role: 'user',
    content: text,
    timestamp: Date.now()
  });

  messageInput.value = '';
  addLoadingMessage();

  try {
    const reply = await window.electronAPI.chatWithAI({
      message: text,
      personality
    });

    removeLoadingMessage();
    addMessageToUI(reply, 'pet-message');

    await window.electronAPI.appendChatMessage({
      role: 'assistant',
      content: reply,
      timestamp: Date.now()
    });

    await loadRelationshipToUI();
    await loadPetAvatar();
  } catch (error) {
    removeLoadingMessage();
    addMessageToUI('出错了，请稍后再试。', 'pet-message');
    console.error(error);
  }
}

openSettingsButton.addEventListener('click', () => {
  window.electronAPI.openSettingsWindow();
});

openMemoryButton.addEventListener('click', () => {
  window.electronAPI.openMemoryWindow();
});

openInventoryButton.addEventListener('click', () => {
  window.electronAPI.openInventoryWindow();
});

openShopButton.addEventListener('click', () => {
  window.electronAPI.openShopWindow();
});

personalitySelect.addEventListener('change', async () => {
  await syncPersonalityToProfile();
});

sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

async function initChatPage() {
  await loadProfileToUI();
  await loadRelationshipToUI();
  await loadPetAvatar();
  await loadChatHistory();
}

initChatPage();

window.addEventListener('focus', () => {
  loadProfileToUI();
  loadRelationshipToUI();
  loadPetAvatar();
  loadChatHistory();
});
