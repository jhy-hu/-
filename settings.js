const userNameInput = document.getElementById('userName');
const userNicknameByPetInput = document.getElementById('userNicknameByPet');
const petNameInput = document.getElementById('petName');
const personalitySelect = document.getElementById('personality');
const petTypeSelect = document.getElementById('petType');
const petAppearanceSelect = document.getElementById('petAppearance');
const activeLevelSelect = document.getElementById('activeLevel');
const saveButton = document.getElementById('saveButton');
const saveStatus = document.getElementById('saveStatus');

async function loadProfile() {
  const profile = await window.electronAPI.getUserProfile();
  if (!profile) return;

  userNameInput.value = profile.userName || '';
  userNicknameByPetInput.value = profile.userNicknameByPet || '';
  petNameInput.value = profile.petName || '';
  personalitySelect.value = profile.personality || 'gentle';
  petTypeSelect.value = profile.petType || 'pet';
  petAppearanceSelect.value = profile.petAppearance || 'cat';
  activeLevelSelect.value = profile.activeLevel || 'normal';
}

async function saveProfile() {
  const profile = {
    userName: userNameInput.value.trim(),
    userNicknameByPet: userNicknameByPetInput.value.trim(),
    petName: petNameInput.value.trim(),
    personality: personalitySelect.value,
    petType: petTypeSelect.value,
    petAppearance: petAppearanceSelect.value,
    activeLevel: activeLevelSelect.value
  };

  const result = await window.electronAPI.saveUserProfile(profile);

  if (result.success) {
    saveStatus.textContent = '保存成功，你的宠物设定已经更新。';
  } else {
    saveStatus.textContent = '保存失败，请稍后再试。';
  }
}

saveButton.addEventListener('click', saveProfile);
loadProfile();
