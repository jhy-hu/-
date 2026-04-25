const inventoryList = document.getElementById('inventoryList');

function formatType(type) {
  const typeMap = {
    food: '食物',
    toy: '玩具',
    home: '住所'
  };
  return typeMap[type] || type;
}

async function useItem(itemId) {
  const result = await window.electronAPI.useInventoryItem(itemId);
  await loadInventory(result.message);
}

async function loadInventory(feedbackText = '') {
  const inventory = await window.electronAPI.getInventory();
  const items = inventory?.items || [];

  inventoryList.innerHTML = '';

  if (items.length === 0) {
    inventoryList.innerHTML = `<div class="empty-state">现在还没有任何道具。</div>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'item-card';

    card.innerHTML = `
      <div class="item-top">
        <div class="item-name">${item.name}</div>
      </div>
      <div class="item-type">类型：${formatType(item.type)}</div>
      <div class="item-meta">
        <span>数量：${item.count}</span>
        <span>亲密度提升：+${item.intimacyGain}</span>
      </div>
      <button class="use-btn" ${item.count <= 0 ? 'disabled' : ''}>使用道具</button>
    `;

    const useBtn = card.querySelector('.use-btn');
    useBtn.addEventListener('click', () => useItem(item.id));

    inventoryList.appendChild(card);
  });

  if (feedbackText) {
    const feedback = document.createElement('div');
    feedback.className = 'feedback';
    feedback.textContent = feedbackText;
    inventoryList.appendChild(feedback);
  }
}

loadInventory();
