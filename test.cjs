const state = {
  characterName: "",
  characterClass: "",
  characterImage: null,
  leftSlots: Array(4).fill(null).map(() => ({ id: Math.random().toString(36).substr(2, 9), title: '', text: '', icon: '', image: null })),
  rightSlots: Array(4).fill(null).map(() => ({ id: Math.random().toString(36).substr(2, 9), title: '', text: '', icon: '', image: null }))
};
console.log(JSON.stringify(state).length);
