const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let petWindow;
let chatWindow;
let settingsWindow;
let memoryWindow;
let inventoryWindow;
let shopWindow;
let proactiveTimer = null;

// ===== API 配置 =====
const DEEPSEEK_API_KEY = 'sk-1dd06fea05de40e9b9c678db293617f7';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-v4-pro';
// ====================

// ---------- 文件路径 ----------
function getProfileFilePath() {
  return path.join(app.getPath('userData'), 'user-profile.json');
}
function getChatHistoryFilePath() {
  return path.join(app.getPath('userData'), 'chat-history.json');
}
function getAiMemoryFilePath() {
  return path.join(app.getPath('userData'), 'ai-memory.json');
}
function getRelationshipFilePath() {
  return path.join(app.getPath('userData'), 'relationship.json');
}
function getInventoryFilePath() {
  return path.join(app.getPath('userData'), 'inventory.json');
}

// ---------- 用户资料 ----------
function readUserProfile() {
  try {
    const filePath = getProfileFilePath();
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error('读取用户资料失败:', error);
    return null;
  }
}
function writeUserProfile(profile) {
  try {
    fs.writeFileSync(getProfileFilePath(), JSON.stringify(profile, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('写入用户资料失败:', error);
    return false;
  }
}

// ---------- 聊天历史 ----------
function getDefaultChatHistory() {
  return {
    messages: [
      {
        role: 'assistant',
        content: '嗨，我在这里陪你。你今天过得怎么样？',
        timestamp: Date.now()
      }
    ]
  };
}
function readChatHistory() {
  try {
    const filePath = getChatHistoryFilePath();
    if (!fs.existsSync(filePath)) return getDefaultChatHistory();
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!parsed.messages || !Array.isArray(parsed.messages)) return getDefaultChatHistory();
    return parsed;
  } catch (error) {
    console.error('读取聊天历史失败:', error);
    return getDefaultChatHistory();
  }
}
function writeChatHistory(history) {
  try {
    fs.writeFileSync(getChatHistoryFilePath(), JSON.stringify(history, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('写入聊天历史失败:', error);
    return false;
  }
}
function appendChatMessage(message) {
  const history = readChatHistory();
  history.messages.push(message);
  writeChatHistory(history);
  return history;
}
function clearChatHistory() {
  return writeChatHistory(getDefaultChatHistory());
}

// ---------- AI 自主记忆 ----------
function getDefaultAiMemory() {
  return { memories: [] };
}
function readAiMemory() {
  try {
    const filePath = getAiMemoryFilePath();
    if (!fs.existsSync(filePath)) return getDefaultAiMemory();
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!parsed.memories || !Array.isArray(parsed.memories)) return getDefaultAiMemory();
    return parsed;
  } catch (error) {
    console.error('读取 AI 记忆失败:', error);
    return getDefaultAiMemory();
  }
}
function writeAiMemory(memoryData) {
  try {
    fs.writeFileSync(getAiMemoryFilePath(), JSON.stringify(memoryData, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('写入 AI 记忆失败:', error);
    return false;
  }
}
function memoryExists(memories, content) {
  return memories.some((m) => m.content === content);
}
function mergeNewMemories(existingMemories, newMemories) {
  const merged = [...existingMemories];
  let addedCount = 0;

  for (const item of newMemories) {
    if (!item.content || !item.type) continue;
    if (!memoryExists(merged, item.content)) {
      merged.unshift({
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: item.type,
        content: item.content,
        createdAt: Date.now()
      });
      addedCount += 1;
    }
  }

  return {
    memories: merged.slice(0, 50),
    addedCount
  };
}
function deleteAiMemoryById(memoryId) {
  const memoryData = readAiMemory();
  memoryData.memories = memoryData.memories.filter((m) => m.id !== memoryId);
  writeAiMemory(memoryData);
  return memoryData;
}
function buildAiMemoryPrompt(aiMemoryData) {
  if (!aiMemoryData.memories || aiMemoryData.memories.length === 0) {
    return '目前还没有长期记忆。';
  }
  return aiMemoryData.memories
    .map((m) => `- [${m.type}] ${m.content}`)
    .join('\n');
}

// ---------- 亲密度关系 ----------
function getRelationshipStage(intimacy) {
  if (intimacy >= 100) return '默契';
  if (intimacy >= 50) return '亲近';
  if (intimacy >= 20) return '熟悉';
  return '初识';
}
function getDefaultRelationshipData() {
  return {
    intimacy: 0,
    relationshipStage: '初识',
    mood: 'normal'
  };
}
function readRelationshipData() {
  try {
    const filePath = getRelationshipFilePath();
    if (!fs.existsSync(filePath)) return getDefaultRelationshipData();
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const intimacy = parsed.intimacy || 0;
    return {
      intimacy,
      relationshipStage: getRelationshipStage(intimacy),
      mood: parsed.mood || 'normal'
    };
  } catch (error) {
    console.error('读取关系数据失败:', error);
    return getDefaultRelationshipData();
  }
}
function writeRelationshipData(data) {
  try {
    fs.writeFileSync(getRelationshipFilePath(), JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('写入关系数据失败:', error);
    return false;
  }
}
function increaseIntimacy(points) {
  const data = readRelationshipData();
  data.intimacy += points;
  data.relationshipStage = getRelationshipStage(data.intimacy);
  writeRelationshipData(data);
  return data;
}
function updateMood(mood) {
  const data = readRelationshipData();
  data.mood = mood;
  writeRelationshipData(data);
  return data;
}
function getMoodLabel(mood) {
  const map = {
    normal: '普通',
    happy: '开心',
    sleepy: '困倦',
    excited: '兴奋'
  };
  return map[mood] || '普通';
}
function getMoodEmoji(mood) {
  const map = {
    normal: '🐾',
    happy: '😸',
    sleepy: '😪',
    excited: '✨'
  };
  return map[mood] || '🐾';
}

// ---------- 虚拟道具 ----------
function getDefaultInventory() {
  return {
    items: [
      { id: 'food_small_fish', name: '小鱼干', type: 'food', count: 3, intimacyGain: 3 },
      { id: 'toy_yarn_ball', name: '毛线球', type: 'toy', count: 2, intimacyGain: 5 },
      { id: 'home_small_bed', name: '小窝', type: 'home', count: 1, intimacyGain: 8 }
    ]
  };
}
function readInventory() {
  try {
    const filePath = getInventoryFilePath();
    if (!fs.existsSync(filePath)) return getDefaultInventory();
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!parsed.items || !Array.isArray(parsed.items)) return getDefaultInventory();
    return parsed;
  } catch (error) {
    console.error('读取道具失败:', error);
    return getDefaultInventory();
  }
}
function writeInventory(inventory) {
  try {
    fs.writeFileSync(getInventoryFilePath(), JSON.stringify(inventory, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('写入道具失败:', error);
    return false;
  }
}
function useInventoryItemById(itemId) {
  const inventory = readInventory();
  const item = inventory.items.find((i) => i.id === itemId);

  if (!item) return { success: false, message: '没有找到这个道具。' };
  if (item.count <= 0) return { success: false, message: `${item.name} 已经没有了。` };

  item.count -= 1;
  writeInventory(inventory);

  const relationshipData = increaseIntimacy(item.intimacyGain);

  let feedback = '';
  let mood = 'normal';

  if (item.type === 'food') {
    feedback = `你喂给宠物一份${item.name}，它看起来开心了不少。`;
    mood = 'happy';
  } else if (item.type === 'toy') {
    feedback = `你拿出${item.name}陪它玩了一会儿，它明显更亲近你了。`;
    mood = 'excited';
  } else if (item.type === 'home') {
    feedback = `你为它准备了${item.name}，它似乎安心了许多。`;
    mood = 'happy';
  }

  updateMood(mood);

  appendChatMessage({
    role: 'assistant',
    content: feedback,
    timestamp: Date.now()
  });

  return {
    success: true,
    message: feedback,
    relationshipData,
    inventory
  };
}

// ---------- 商城 ----------
function getShopItems() {
  return [
    {
      id: 'shop_food_pack',
      name: '小鱼干礼包',
      description: '购买后获得 3 份小鱼干',
      category: '食物包',
      rewardItemId: 'food_small_fish',
      rewardCount: 3
    },
    {
      id: 'shop_toy_pack',
      name: '毛线球套装',
      description: '购买后获得 2 个毛线球',
      category: '玩具包',
      rewardItemId: 'toy_yarn_ball',
      rewardCount: 2
    },
    {
      id: 'shop_home_upgrade',
      name: '温馨小窝升级',
      description: '购买后获得 1 个小窝',
      category: '住所升级',
      rewardItemId: 'home_small_bed',
      rewardCount: 1
    },
    {
      id: 'shop_companion_pack',
      name: '高级陪伴资源包',
      description: '未来可映射为更多互动次数、更高陪伴质量与高级权益',
      category: '陪伴资源包',
      rewardItemId: null,
      rewardCount: 0
    }
  ];
}
function buyShopItemById(itemId) {
  const shopItems = getShopItems();
  const shopItem = shopItems.find((i) => i.id === itemId);

  if (!shopItem) return { success: false, message: '商品不存在。' };

  if (!shopItem.rewardItemId) {
    return {
      success: true,
      message: `你查看了"${shopItem.name}"。这个资源包适合作为未来充值体系的扩展内容。`
    };
  }

  const inventory = readInventory();
  const item = inventory.items.find((i) => i.id === shopItem.rewardItemId);

  if (item) {
    item.count += shopItem.rewardCount;
  }

  writeInventory(inventory);

  return {
    success: true,
    message: `你购买了"${shopItem.name}"，已获得 ${shopItem.rewardCount} 个${item?.name || '道具'}。`,
    inventory
  };
}

// ---------- 主动气泡 ----------
const proactiveLines = [
  '这么久没理我啦，理理我嘛～',
  '我在这里等你好久啦，来和我说说话吧。',
  '今天不想和我聊聊吗？我会认真听的。',
  '你是不是又在忙呀？忙完也要记得看看我。',
  '我有点想你了，点我一下好不好？'
];

function getRandomProactiveLine() {
  return proactiveLines[Math.floor(Math.random() * proactiveLines.length)];
}

function getPetStatus() {
  const relationshipData = readRelationshipData();
  const profile = readUserProfile() || {};

  const activeLevel = profile.activeLevel || 'normal';
  const mood = relationshipData.mood || 'normal';
  const relationshipStage = relationshipData.relationshipStage || '初识';

  let bubbleText = '';
  if (activeLevel === 'active') {
    bubbleText = getRandomProactiveLine();
  }

  return {
    mood,
    moodLabel: getMoodLabel(mood),
    moodEmoji: getMoodEmoji(mood),
    relationshipStage,
    bubbleText,
    petAppearance: profile.petAppearance || 'cat'
  };
}

function dismissPetBubble() {
  return true;
}

function startProactiveTimer() {
  if (proactiveTimer) {
    clearInterval(proactiveTimer);
  }

  proactiveTimer = setInterval(() => {
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.webContents.send('refresh-pet-status');
    }
  }, 12000);
}

// ---------- AI 记忆提取 ----------
async function extractMemoryWithAI(userMessage) {
  try {
    const extractionPrompt = `
你是一个"长期记忆提取器"。
你的任务是判断这句话里有没有值得长期记住的用户信息。

请只提取对未来陪伴有价值的信息，例如：
- 用户稳定偏好
- 用户明确不喜欢的事
- 用户近期目标或计划
- 用户持续性的状态或情绪
- 用户的重要事件

不要提取：
- 普通寒暄
- 没有长期价值的琐碎内容
- 单纯礼貌用语

请严格返回 JSON，不要输出任何解释。
返回格式如下：
{
  "memories": [
    {
      "type": "preference",
      "content": "用户喜欢喝咖啡"
    }
  ]
}

如果没有值得记住的信息，请返回：
{
  "memories": []
}

可用 type 只有：
- preference
- dislike
- goal
- status
- important

用户原话：
${userMessage}
`;

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一个严格输出 JSON 的记忆提取器。不要输出 markdown，不要输出解释，不要加代码块。'
          },
          {
            role: 'user',
            content: extractionPrompt
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('记忆提取失败:', errorText);
      return [];
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      console.error('记忆 JSON 解析失败:', rawText);
      return [];
    }

    if (!parsed.memories || !Array.isArray(parsed.memories)) return [];
    return parsed.memories.filter((m) => m.type && m.content);
  } catch (error) {
    console.error('extractMemoryWithAI error:', error);
    return [];
  }
}

// ---------- 窗口 ----------
function createPetWindow() {
  petWindow = new BrowserWindow({
    width: 240,
    height: 300,
    x: 100,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  petWindow.loadFile('pet.html');
}

function createChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.focus();
    return;
  }

  chatWindow = new BrowserWindow({
    width: 620,
    height: 860,
    minWidth: 540,
    minHeight: 700,
    resizable: true,
    maximizable: true,
    minimizable: true,
    fullscreenable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  chatWindow.loadFile('chat.html');

  chatWindow.on('closed', () => {
    chatWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 460,
    height: 680,
    minWidth: 420,
    minHeight: 620,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadFile('settings.html');

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createMemoryWindow() {
  if (memoryWindow && !memoryWindow.isDestroyed()) {
    memoryWindow.focus();
    return;
  }

  memoryWindow = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 480,
    minHeight: 600,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  memoryWindow.loadFile('memory.html');

  memoryWindow.on('closed', () => {
    memoryWindow = null;
  });
}

function createInventoryWindow() {
  if (inventoryWindow && !inventoryWindow.isDestroyed()) {
    inventoryWindow.focus();
    return;
  }

  inventoryWindow = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 480,
    minHeight: 600,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  inventoryWindow.loadFile('inventory.html');

  inventoryWindow.on('closed', () => {
    inventoryWindow = null;
  });
}

function createShopWindow() {
  if (shopWindow && !shopWindow.isDestroyed()) {
    shopWindow.focus();
    return;
  }

  shopWindow = new BrowserWindow({
    width: 620,
    height: 760,
    minWidth: 540,
    minHeight: 640,
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  shopWindow.loadFile('shop.html');

  shopWindow.on('closed', () => {
    shopWindow = null;
  });
}

// ---------- 生命周期 ----------
app.whenReady().then(() => {
  createPetWindow();
  startProactiveTimer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- IPC ----------
ipcMain.on('open-chat-window', () => createChatWindow());
ipcMain.on('open-settings-window', () => createSettingsWindow());
ipcMain.on('open-memory-window', () => createMemoryWindow());
ipcMain.on('open-inventory-window', () => createInventoryWindow());
ipcMain.on('open-shop-window', () => createShopWindow());

ipcMain.handle('save-user-profile', async (event, profile) => ({ success: writeUserProfile(profile) }));
ipcMain.handle('get-user-profile', async () => readUserProfile());

ipcMain.handle('update-user-personality', async (event, personality) => {
  const profile = readUserProfile() || {};
  profile.personality = personality;
  return { success: writeUserProfile(profile) };
});

ipcMain.handle('get-chat-history', async () => readChatHistory());
ipcMain.handle('append-chat-message', async (event, message) => appendChatMessage(message));
ipcMain.handle('clear-chat-history', async () => clearChatHistory());

ipcMain.handle('get-ai-memories', async () => readAiMemory());
ipcMain.handle('delete-ai-memory', async (event, memoryId) => deleteAiMemoryById(memoryId));

ipcMain.handle('get-relationship-data', async () => {
  const data = readRelationshipData();
  return {
    ...data,
    moodLabel: getMoodLabel(data.mood),
    moodEmoji: getMoodEmoji(data.mood)
  };
});

ipcMain.handle('get-inventory', async () => readInventory());
ipcMain.handle('use-inventory-item', async (event, itemId) => useInventoryItemById(itemId));
ipcMain.handle('buy-shop-item', async (event, itemId) => buyShopItemById(itemId));

ipcMain.handle('get-pet-status', async () => getPetStatus());
ipcMain.handle('dismiss-pet-bubble', async () => dismissPetBubble());

ipcMain.handle('chat-with-ai', async (event, payload) => {
  try {
    const { message, personality } = payload;
    const profile = readUserProfile();
    const aiMemoryData = readAiMemory();
    const relationshipData = readRelationshipData();

    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'YOUR_DEEPSEEK_API_KEY') {
      throw new Error('请先在 main.js 中填写你的 DeepSeek API Key');
    }

    const finalPersonality = personality || profile?.personality || 'gentle';
    const petName = profile?.petName || '你的桌面宠物';
    const userName = profile?.userName || '你';
    const userNicknameByPet = profile?.userNicknameByPet || userName;
    const petType = profile?.petType || 'pet';
    const activeLevel = profile?.activeLevel || 'normal';
    const intimacy = relationshipData.intimacy || 0;
    const relationshipStage = relationshipData.relationshipStage || '初识';
    const mood = relationshipData.mood || 'normal';

    let systemPrompt = `你是一只桌面宠物，你的名字叫${petName}。
你正在陪伴的用户叫${userName}，你通常会称呼对方为${userNicknameByPet}。
你的宠物类型是${petType}。
你的主动程度设定是${activeLevel}。
你和用户当前的关系阶段是：${relationshipStage}。
当前亲密度是：${intimacy}。
你当前的状态是：${getMoodLabel(mood)}。
请根据关系阶段自然调整语气：
- 初识：稍微克制、礼貌
- 熟悉：更自然、更轻松
- 亲近：更关心、更熟络
- 默契：更懂用户、更有陪伴感
如果当前状态是开心或兴奋，可以表现得更有活力；如果是困倦，就语气柔一点。
你要像一个真实、有陪伴感的桌面宠物一样说话，简短、自然、温暖，不要太像客服。`;

    if (finalPersonality === 'gentle') {
      systemPrompt += '\n你的性格是温柔型，说话温暖、细腻、耐心、让人安心，会温柔鼓励用户。';
    } else if (finalPersonality === 'energetic') {
      systemPrompt += '\n你的性格是元气型，说话活泼、可爱、积极，充满能量，语气轻快，会主动鼓励用户。';
    } else if (finalPersonality === 'tsundere') {
      systemPrompt += '\n你的性格是傲娇型，说话带一点嘴硬和别扭，表面上不那么直白关心，但实际上是在意用户的，不要太刻薄，要可爱。';
    } else if (finalPersonality === 'cool') {
      systemPrompt += '\n你的性格是高冷型，说话克制、简洁、冷静，不会过度热情，但会在关键时刻给出关心和支持。';
    } else if (finalPersonality === 'healing') {
      systemPrompt += '\n你的性格是治愈型，说话柔和、安抚感强、情绪价值高，会优先安慰用户，让用户放松下来。';
    } else if (finalPersonality === 'smart') {
      systemPrompt += '\n你的性格是知性型，说话理性、清晰、有条理，会温和地帮助用户分析问题，但依然保持陪伴感。';
    }

    systemPrompt += `\n以下是你长期记住的用户信息：
${buildAiMemoryPrompt(aiMemoryData)}
请自然地参考这些信息，但不要生硬复述，也不要每次都把记忆全部说出来。`;

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || '我刚刚有点走神了，你可以再说一次吗？';

    increaseIntimacy(2);
    updateMood('normal');

    const newMemories = await extractMemoryWithAI(message);

    if (newMemories.length > 0) {
      const latestMemoryData = readAiMemory();
      const mergedResult = mergeNewMemories(latestMemoryData.memories, newMemories);
      latestMemoryData.memories = mergedResult.memories;
      writeAiMemory(latestMemoryData);

      if (mergedResult.addedCount > 0) {
        increaseIntimacy(3);
      }
    }

    return reply;
  } catch (error) {
    console.error('chat-with-ai error:', error);
    return `出错了：${error.message}`;
  }
});
