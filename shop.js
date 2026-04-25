const shopList = document.getElementById('shopList');

const shopItems = [
  {
    id: 'shop_food_pack',
    name: '小鱼干礼包',
    category: '食物包',
    description: '购买后获得 3 份小鱼干'
  },
  {
    id: 'shop_toy_pack',
    name: '毛线球套装',
    category: '玩具包',
    description: '购买后获得 2 个毛线球'
  },
  {
    id: 'shop_home_upgrade',
    name: '温馨小窝升级',
    category: '住所升级',
    description: '购买后获得 1 个小窝'
  },
  {
    id: 'shop_companion_pack',
    name: '高级陪伴资源包',
    category: '陪伴资源包',
    description: '未来可映射为更多互动次数、更高陪伴质量与高级权益'
  }
];

async function buyItem(itemId) {
  const result = await window.electronAPI.buyShopItem(itemId);
  renderShop(result.message);
}

function renderShop(feedbackText = '') {
  shopList.innerHTML = '';

  shopItems.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'shop-card';

    card.innerHTML = `
      <div class="shop-name">${item.name}</div>
      <div class="shop-category">${item.category}</div>
      <div class="shop-desc">${item.description}</div>
      <button class="buy-btn">购买</button>
    `;

    const btn = card.querySelector('.buy-btn');
    btn.addEventListener('click', () => buyItem(item.id));

    shopList.appendChild(card);
  });

  if (feedbackText) {
    const feedback = document.createElement('div');
    feedback.className = 'shop-feedback';
    feedback.textContent = feedbackText;
    shopList.appendChild(feedback);
  }
}

renderShop();
