const pet = document.getElementById('pet');
const petImage = document.getElementById('petImage');
const petTip = document.getElementById('petTip');
const petBubble = document.getElementById('petBubble');

function getPetImagePath(petAppearance, mood) {
  return `assets/pets/${petAppearance}/${mood}.png`;
}

let bubbleTimer = null;

async function loadPetState() {
  const status = await window.electronAPI.getPetStatus();

  const petAppearance = status?.petAppearance || 'cat';
  const mood = status?.mood || 'normal';
  const stage = status?.relationshipStage || '初识';
  const moodLabel = status?.moodLabel || '普通';
  const bubbleText = status?.bubbleText || '';

  petImage.src = getPetImagePath(petAppearance, mood);
  petImage.onerror = () => {
    petImage.src = getPetImagePath('cat', 'normal');
  };

  petTip.textContent = `${moodLabel} · ${stage}，点我聊天`;

  if (bubbleText) {
    petBubble.textContent = bubbleText;
    petBubble.classList.add('show');

    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
      petBubble.classList.remove('show');
    }, 5000);
  }
}

pet.addEventListener('click', () => {
  petBubble.classList.remove('show');
  window.electronAPI.dismissPetBubble();
  window.electronAPI.openChatWindow();
});

loadPetState();

window.addEventListener('focus', () => {
  loadPetState();
});
