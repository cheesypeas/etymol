// Game state
let currentWord;
let guessedWords = new Set();
let treeData;
let allWordsRevealed = false;
let tooltip;
let selectedIndex = -1;
let suggestions = [];
let systemWords = new Set(); // Store system words
let revealedNodes = new Set(); // Track which nodes are revealed
let incorrectGuesses = 0; // Track number of incorrect guesses

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

// Load system words from the word list
function loadSystemWords() {
    // Add all words from the game's word list
    GAME_DATA.word_list.forEach(word => systemWords.add(word.toLowerCase()));
    
    // Add all related words from all puzzles
    Object.values(GAME_DATA.words).forEach(wordData => {
        wordData.related_words.forEach(word => systemWords.add(word.toLowerCase()));
    });
}

// Initialize revealed nodes with the path from root to clue word
function initializeRevealedNodes() {
    revealedNodes.clear();
    
    // Find the path from root to clue word
    function findPathToWord(node, targetWord, path = []) {
        if (!node || !node.data) return null;
        
        path.push(node);
        
        if (node.data.word === targetWord) {
            return path;
        }
        
        if (node.children) {
            for (const child of node.children) {
                const result = findPathToWord(child, targetWord, [...path]);
                if (result) return result;
            }
        }
        
        return null;
    }
    
    // Create hierarchy first
    const root = d3.hierarchy(treeData);
    const path = findPathToWord(root, currentWord);
    
    if (path) {
        path.forEach(node => {
            if (node.data && node.data.word) {
                revealedNodes.add(node.data.word);
            }
        });
    }
}

// Get the next node to reveal
function getNextNodeToReveal() {
    // Create hierarchy first
    const root = d3.hierarchy(treeData);
    
    // Get all nodes in the tree
    const allNodes = [];
    function traverse(node) {
        if (!node || !node.data) return;
        allNodes.push(node);
        if (node.children) {
            node.children.forEach(traverse);
        }
    }
    traverse(root);
    
    // Filter out already revealed nodes, the clue word, and correct answers
    const unrevealedNodes = allNodes.filter(node => 
        node.data && 
        node.data.word && 
        !revealedNodes.has(node.data.word) && 
        node.data.word !== currentWord &&
        !GAME_DATA.words[currentWord].related_words.includes(node.data.word)
    );
    
    // If no unrevealed nodes, return null
    if (unrevealedNodes.length === 0) return null;
    
    // Return the first unrevealed node
    return unrevealedNodes[0];
}

// Check if a node should be revealed based on its children
function shouldRevealNode(node) {
    // If all words are revealed, show everything
    if (allWordsRevealed) {
        return true;
    }
    
    // Show node if it's in the revealed set
    return revealedNodes.has(node.data.word);
}

// Convert non-English words to anglicized form
function anglicizeWord(word) {
    return word
        .toLowerCase()
        .normalize('NFD')  // Decompose characters with diacritics
        .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
        .replace(/[^a-z]/g, '')  // Remove non-letters
        .replace(/[æ]/g, 'ae')  // Common ligatures
        .replace(/[œ]/g, 'oe')
        .replace(/[ß]/g, 'ss');
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
    
    // Draw links - only between revealed nodes
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
            .y(d => d.x))
        .style('opacity', d => {
            // Only show links where both source and target are revealed
            const sourceRevealed = shouldRevealNode(d.source);
            const targetRevealed = shouldRevealNode(d.target);
            return (sourceRevealed && targetRevealed) ? 1 : 0;
        });
    
    // Draw nodes
    const node = svg.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .style('opacity', d => shouldRevealNode(d) ? 1 : 0); // Hide unrevealed nodes
    
    // Add circles to nodes
    node.append('circle')
        .attr('r', 5)
        .attr('fill', d => {
            if (shouldRevealNode(d)) {
                return d.data.lang === 'en' ? '#ffd700' : '#fff';
            }
            return '#333';
        });
    
    // Add text labels
    node.append('text')
        .attr('dy', '1.5em')
        .attr('x', d => d.children ? -9 : 9)
        .attr('text-anchor', d => d.children ? 'end' : 'start')
        .attr('fill', d => {
            if (!shouldRevealNode(d)) {
                return '#666';
            }
            return d.data.lang === 'en' ? '#ffd700' : '#fff';
        })
        .attr('font-weight', d => (d.data.lang === 'en') ? 'bold' : 'normal')
        .text(d => {
            if (!shouldRevealNode(d)) {
                return '???';
            }
            return d.data.word;  // Always show actual word
        })
        // Add tooltip behavior
        .on('mouseover', function(event, d) {
            if (shouldRevealNode(d)) {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                let tooltipText = '';
                if (d.data.lang !== 'en') {
                    tooltipText += `Anglicized: ${d.data.anglicized}<br>`;
                }
                tooltipText += `Language: ${d.data.lang}<br>`;
                if (d.data.gloss) {
                    tooltipText += `Meaning: ${d.data.gloss}`;
                }
                tooltip.html(tooltipText)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            }
        })
        .on('mouseout', function() {
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });
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
        
        // Find and reveal the path to the guessed word
        function findPathToWord(node, targetWord, path = []) {
            if (!node || !node.data) return null;
            
            path.push(node);
            
            if (node.data.word === targetWord) {
                return path;
            }
            
            if (node.children) {
                for (const child of node.children) {
                    const result = findPathToWord(child, targetWord, [...path]);
                    if (result) return result;
                }
            }
            
            return null;
        }
        
        // Create hierarchy and find path
        const root = d3.hierarchy(treeData);
        const path = findPathToWord(root, guess);
        
        // Debug logging
        console.log('Finding path to word:', guess);
        console.log('Path found:', path ? path.map(n => n.data.word) : 'No path found');
        
        // Reveal all nodes in the path
        if (path) {
            path.forEach(node => {
                if (node.data && node.data.word) {
                    revealedNodes.add(node.data.word);
                    console.log('Revealing node:', node.data.word);
                }
            });
        }
        
        // Also reveal the guessed word itself
        revealedNodes.add(guess);
        console.log('Revealed nodes:', Array.from(revealedNodes));
        
        renderTree();
    } else {
        feedback.textContent = 'Incorrect. Try again!';
        feedback.className = 'incorrect';
        
        // Reveal one more node for incorrect guess
        const nextNode = getNextNodeToReveal();
        if (nextNode) {
            revealedNodes.add(nextNode.data.word);
            incorrectGuesses++;
            renderTree();
        }
    }
    
    guessInput.value = '';
    guessInput.focus();
}

// Handle reveal all button click
function handleRevealAll() {
    allWordsRevealed = true;
    renderTree();
    document.getElementById('reveal-button').disabled = true;
}

// Handle guess input changes
function handleGuessInput(event) {
    const guessInput = event.target;
    const searchTerm = guessInput.value.toLowerCase().trim();
    
    if (searchTerm.length < 2) {
        hideSuggestions();
        return;
    }
    
    // Filter valid words that haven't been guessed
    suggestions = Array.from(systemWords)
        .filter(word => 
            word.includes(searchTerm) && 
            !guessedWords.has(word)
        )
        .sort((a, b) => {
            // Sort by whether the word is in the current puzzle's related words
            const aIsRelated = GAME_DATA.words[currentWord].related_words.includes(a);
            const bIsRelated = GAME_DATA.words[currentWord].related_words.includes(b);
            if (aIsRelated && !bIsRelated) return -1;
            if (!aIsRelated && bIsRelated) return 1;
            return a.localeCompare(b);
        })
        .slice(0, 10); // Limit to 10 suggestions
    
    if (suggestions.length > 0) {
        showSuggestions(suggestions);
    } else {
        hideSuggestions();
    }
}

// Handle keyboard navigation in suggestions
function handleGuessKeydown(event) {
    const suggestionsDiv = document.querySelector('.suggestions');
    
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            if (suggestionsDiv) {
                selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
                updateSelectedSuggestion();
            }
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            if (suggestionsDiv) {
                selectedIndex = Math.max(selectedIndex - 1, 0);
                updateSelectedSuggestion();
            }
            break;
            
        case 'Enter':
            event.preventDefault();
            if (suggestionsDiv && selectedIndex >= 0 && selectedIndex < suggestions.length) {
                const guessInput = document.getElementById('guess-input');
                guessInput.value = suggestions[selectedIndex];
                handleGuess();
                hideSuggestions();
            } else {
                handleGuess();
            }
            break;
            
        case 'Escape':
            hideSuggestions();
            break;
    }
}

// Show suggestions dropdown
function showSuggestions(results) {
    // Remove existing suggestions
    hideSuggestions();
    
    // Create suggestions container
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'suggestions';
    suggestionsDiv.style.position = 'absolute';
    suggestionsDiv.style.top = '100%';
    suggestionsDiv.style.left = '0';
    suggestionsDiv.style.width = document.getElementById('guess-input').offsetWidth + 'px';
    suggestionsDiv.style.background = '#222';
    suggestionsDiv.style.border = '1px solid #444';
    suggestionsDiv.style.borderRadius = '4px';
    suggestionsDiv.style.maxHeight = '200px';
    suggestionsDiv.style.overflowY = 'auto';
    suggestionsDiv.style.zIndex = '1000';
    
    // Add suggestion items
    results.forEach((word, index) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = word;
        item.style.padding = '8px';
        item.style.cursor = 'pointer';
        item.style.color = '#fff';
        
        item.addEventListener('mouseover', () => {
            selectedIndex = index;
            updateSelectedSuggestion();
        });
        
        item.addEventListener('click', () => {
            const guessInput = document.getElementById('guess-input');
            guessInput.value = word;
            handleGuess();
            hideSuggestions();
        });
        
        suggestionsDiv.appendChild(item);
    });
    
    // Add to DOM - position relative to input field
    const inputField = document.getElementById('guess-input');
    const inputRect = inputField.getBoundingClientRect();
    
    suggestionsDiv.style.position = 'fixed';
    suggestionsDiv.style.top = (inputRect.bottom) + 'px';
    suggestionsDiv.style.left = (inputRect.left) + 'px';
    
    document.body.appendChild(suggestionsDiv);
    
    // Reset selection
    selectedIndex = -1;
}

// Update the selected suggestion
function updateSelectedSuggestion() {
    const items = document.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
        item.style.background = index === selectedIndex ? '#444' : '';
    });
}

// Hide suggestions dropdown
function hideSuggestions() {
    const suggestionsDiv = document.querySelector('.suggestions');
    if (suggestionsDiv) {
        suggestionsDiv.remove();
    }
    selectedIndex = -1;
}

// Initialize the game when the page loads
function initGame() {
    // Get the word from URL or use default
    currentWord = getWordFromUrl();
    treeData = GAME_DATA.words[currentWord].tree;
    
    // Add the clue word to guessed words (it's pre-revealed)
    guessedWords.add(currentWord);
    
    // Display the clue word
    document.getElementById('clue-word').textContent = currentWord;
    
    // Create tooltip div (only once)
    tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'fixed')
        .style('background-color', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('pointer-events', 'none')
        .style('z-index', '1000');
    
    // Load system words
    loadSystemWords();
    
    // Initialize revealed nodes with the path from root to clue word
    initializeRevealedNodes();
    
    // Render the initial tree (only showing path to clue word)
    renderTree();
    
    // Set up guess input autocomplete
    const guessInput = document.getElementById('guess-input');
    guessInput.addEventListener('input', handleGuessInput);
    guessInput.addEventListener('keydown', handleGuessKeydown);
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (event) => {
        const guessContainer = document.querySelector('.guess-container');
        if (!guessContainer.contains(event.target)) {
            hideSuggestions();
        }
    });
    
    // Focus the input field
    guessInput.focus();
}

// Event listeners
document.getElementById('guess-button').addEventListener('click', handleGuess);
document.getElementById('reveal-button').addEventListener('click', handleRevealAll);
document.getElementById('guess-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleGuess();
    }
});

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', initGame); 