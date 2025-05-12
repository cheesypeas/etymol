// Game state
let currentWord;
let guessedWords = new Set();
let treeData;

// Get a random word from the word list
function getRandomWord() {
    return GAME_DATA.word_list[Math.floor(Math.random() * GAME_DATA.word_list.length)];
}

// Get word from URL parameters or use random/default
function getWordFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const word = urlParams.get('word');
    if (word === 'random') {
        return getRandomWord();
    }
    return word || GAME_DATA.word_list[0];  // Use provided word or default to first word
}

// Initialize the game
function initGame() {
    // Get the word from URL or use default
    currentWord = getWordFromUrl();
    treeData = GAME_DATA.words[currentWord].tree;
    
    // Add the clue word to guessed words (it's pre-revealed)
    guessedWords.add(currentWord);
    
    // Display the clue word
    document.getElementById('clue-word').textContent = currentWord;
    
    // Render the initial tree (with English words redacted, except clue word)
    renderTree();
    
    // Focus the input field
    document.getElementById('guess-input').focus();
}

// Check if a node should be revealed based on its children
function shouldRevealNode(node) {
    // Always reveal guessed words
    if (guessedWords.has(node.data.word)) {
        return true;
    }
    
    // For non-guessed words, check if all children are revealed
    if (node.children) {
        return node.children.every(child => shouldRevealNode(child));
    }
    
    return false;
}

// Render the etymology tree using D3
function renderTree() {
    const treeContainer = document.getElementById('tree-container');
    treeContainer.innerHTML = ''; // Clear previous tree
    
    // Set dimensions and margins
    const margin = {top: 20, right: 90, bottom: 30, left: 90};
    const width = treeContainer.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Create the tree layout
    const treeLayout = d3.tree().size([height, width]);
    const root = d3.hierarchy(treeData);
    treeLayout(root);
    
    // Create SVG
    const svg = d3.select(treeContainer)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Draw links
    svg.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', '#555')
        .attr('stroke-width', 1.5)
        .attr('d', d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x));
    
    // Draw nodes
    const node = svg.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.y},${d.x})`);
    
    // Add circles to nodes
    node.append('circle')
        .attr('r', 5)
        .attr('fill', d => {
            if (shouldRevealNode(d)) {
                return '#fff';
            }
            return '#333';
        });
    
    // Add text labels
    node.append('text')
        .attr('dy', '1.5em')
        .attr('x', d => d.children ? -9 : 9)
        .attr('text-anchor', d => d.children ? 'end' : 'start')
        .attr('fill', d => {
            if (shouldRevealNode(d)) {
                return '#fff';
            }
            return '#666';
        })
        .text(d => {
            if (!shouldRevealNode(d)) {
                return '???';
            }
            return d.data.word;
        });
    
    // Add gloss labels where they differ from the word
    node.filter(d => shouldRevealNode(d) && d.data.gloss && d.data.gloss !== d.data.word)
        .append('text')
        .attr('dy', '3em')
        .attr('x', d => d.children ? -9 : 9)
        .attr('text-anchor', d => d.children ? 'end' : 'start')
        .attr('fill', '#888')
        .style('font-size', '0.8em')
        .text(d => d.data.gloss);
}

// Handle word guesses
function handleGuess() {
    const guessInput = document.getElementById('guess-input');
    const guess = guessInput.value.toLowerCase().trim();
    
    if (!guess) return;
    
    const feedback = document.getElementById('feedback');
    
    if (guessedWords.has(guess)) {
        feedback.textContent = 'You already guessed that word!';
        feedback.className = 'incorrect';
    } else if (GAME_DATA.words[currentWord].related_words.includes(guess)) {
        guessedWords.add(guess);
        feedback.textContent = 'Correct!';
        feedback.className = 'correct';
        renderTree();
    } else {
        feedback.textContent = 'Incorrect. Try again!';
        feedback.className = 'incorrect';
    }
    
    guessInput.value = '';
    guessInput.focus();
}

// Event listeners
document.getElementById('guess-button').addEventListener('click', handleGuess);
document.getElementById('guess-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleGuess();
    }
});

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', initGame); 