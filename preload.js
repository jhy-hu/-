const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openChatWindow: () => ipcRenderer.send('open-chat-window'),
  openSettingsWindow: () => ipcRenderer.send('open-settings-window'),
  openMemoryWindow: () => ipcRenderer.send('open-memory-window'),
  openInventoryWindow: () => ipcRenderer.send('open-inventory-window'),
  openShopWindow: () => ipcRenderer.send('open-shop-window'),

  chatWithAI: (payload) => ipcRenderer.invoke('chat-with-ai', payload),

  saveUserProfile: (profile) => ipcRenderer.invoke('save-user-profile', profile),
  getUserProfile: () => ipcRenderer.invoke('get-user-profile'),
  updateUserPersonality: (personality) => ipcRenderer.invoke('update-user-personality', personality),

  getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
  appendChatMessage: (message) => ipcRenderer.invoke('append-chat-message', message),
  clearChatHistory: () => ipcRenderer.invoke('clear-chat-history'),

  getAiMemories: () => ipcRenderer.invoke('get-ai-memories'),
  deleteAiMemory: (memoryId) => ipcRenderer.invoke('delete-ai-memory', memoryId),

  getRelationshipData: () => ipcRenderer.invoke('get-relationship-data'),

  getInventory: () => ipcRenderer.invoke('get-inventory'),
  useInventoryItem: (itemId) => ipcRenderer.invoke('use-inventory-item', itemId),

  buyShopItem: (itemId) => ipcRenderer.invoke('buy-shop-item', itemId),

  getPetStatus: () => ipcRenderer.invoke('get-pet-status'),
  dismissPetBubble: () => ipcRenderer.invoke('dismiss-pet-bubble')
});
