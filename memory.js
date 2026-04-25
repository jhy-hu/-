const memoryList = document.getElementById('memoryList');

function formatType(type) {
  const typeMap = {
    preference: '偏好',
    dislike: '不喜欢',
    goal: '目标',
    status: '状态',
    important: '重要事件'
  };

  return typeMap[type] || type;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

async function deleteMemory(memoryId) {
  await window.electronAPI.deleteAiMemory(memoryId);
  await loadMemories();
}

async function loadMemories() {
  const data = await window.electronAPI.getAiMemories();
  const memories = data?.memories || [];

  memoryList.innerHTML = '';

  if (memories.length === 0) {
    memoryList.innerHTML = `<div class="empty-state">宠物现在还没有记住太多内容。</div>`;
    return;
  }

  memories.forEach((memory) => {
    const card = document.createElement('div');
    card.className = 'memory-card';

    card.innerHTML = `
      <div class="memory-top">
        <span class="memory-type">${formatType(memory.type)}</span>
        <button class="delete-btn" data-id="${memory.id}">删除</button>
      </div>
      <div class="memory-content">${memory.content}</div>
      <div class="memory-time">记录时间：${formatTime(memory.createdAt)}</div>
    `;

    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteMemory(memory.id));

    memoryList.appendChild(card);
  });
}

loadMemories();
