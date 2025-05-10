
// Select a word of the day based on UTC days since a fixed start date
function getWordOfTheDay() {
  // TESTING ONLY: Use random word if ?random=1
  if (typeof getQueryParam === 'function' && getQueryParam('random') === '1') {
    return getRandomWord();
  }
  // Use UTC date to avoid timezone differences
  const now = new Date();
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();
  // Set a fixed start date (e.g., Jan 1, 2024)
  const start = new Date(Date.UTC(2024, 0, 1));
  const today = new Date(Date.UTC(utcYear, utcMonth, utcDate));
  // Calculate days since start date
  const daysSinceStart = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  // Use modulo to cycle through words
  return words[(daysSinceStart % words.length + words.length) % words.length];
}

const gameState = {
  wordObj: getWordOfTheDay(),
  currentStep: 0,
  completed: false
};

function updateUI() {
  document.getElementById('word-of-the-day').textContent = gameState.wordObj.word;
  document.getElementById('progress').textContent = `Step ${gameState.currentStep + 1} of ${gameState.wordObj.etymology.length}`;
  document.getElementById('feedback').textContent = '';
  document.getElementById('guess-input').value = '';
  document.getElementById('guess-input').disabled = false;
  document.querySelector('#guess-form button').disabled = false;
  document.getElementById('etymology-descriptions').innerHTML = '';
}

function showWin() {
  document.getElementById('feedback').textContent = '🎉 Correct! You traced the word to its origin!';
  document.getElementById('guess-input').disabled = true;
  document.querySelector('#guess-form button').disabled = true;
}

// Add a new div for etymology descriptions if not present
if (!document.getElementById('etymology-descriptions')) {
  const descDiv = document.createElement('div');
  descDiv.id = 'etymology-descriptions';
  descDiv.style.margin = '1em 0';
  document.getElementById('game-container').appendChild(descDiv);
}

document.getElementById('guess-form').addEventListener('submit', function(e) {
  e.preventDefault();
  if (gameState.completed) return;
  const guess = document.getElementById('guess-input').value.trim().toLowerCase();
  const correct = gameState.wordObj.etymology[gameState.currentStep].toLowerCase();
  if (guess === correct) {
    gameState.currentStep++;
    // Show etymology description if available
    const descArr = gameState.wordObj.descriptions;
    if (descArr && descArr[gameState.currentStep - 1]) {
      const descDiv = document.getElementById('etymology-descriptions');
      const p = document.createElement('p');
      p.textContent = descArr[gameState.currentStep - 1];
      descDiv.appendChild(p);
    }
    document.getElementById('feedback').textContent = '✅ Correct!';
    if (gameState.currentStep === gameState.wordObj.etymology.length) {
      gameState.completed = true;
      showWin();
    } else {
      // Don't clear descriptions, just clear input and feedback after a short delay
      setTimeout(() => {
        document.getElementById('feedback').textContent = '';
        document.getElementById('guess-input').value = '';
        document.getElementById('guess-input').focus();
      }, 1200);
    }
  } else {
    document.getElementById('feedback').textContent = '❌ Try again.';
    const container = document.getElementById('game-container');
    container.classList.remove('shake');
    void container.offsetWidth;
    container.classList.add('shake');
    setTimeout(() => container.classList.remove('shake'), 400);
  }
});

// Initialize UI on page load
document.addEventListener('DOMContentLoaded', updateUI);
