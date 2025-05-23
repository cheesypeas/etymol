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
let maxIncorrectGuesses = 0; // Maximum allowed incorrect guesses
let gameOver = false; // Track if game is over
let totalEnglishWords = 0; // Total number of English words in the tree
let gameStarted = false; // Track if game has started

// Get a random word from the word list
function getRandomWord() {
    return GAME_DATA.word_list[Math.floor(Math.random() * GAME_DATA.word_list.length)];
}

// Get the daily word based on the current date
function getDailyWord() {
    // Get the current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Use the date as a seed for consistent word selection
    const seed = today.split('-').join('');
    const seedNum = parseInt(seed);
    
    // Use the seed to select a word from the list
    const wordIndex = seedNum % GAME_DATA.word_list.length;
    return GAME_DATA.word_list[wordIndex];
}

// Get word from URL parameters or use daily word
function getWordFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const word = urlParams.get('word');
    if (word === 'random') {
        return getRandomWord();
    }
    if (word) {
        return word;  // Use provided word for testing
    }
    return getDailyWord();  // Use daily word by default
}

// Load system words from the word list
function loadSystemWords() {
    console.log('Loading system words...');
    let count = 0;
    
    // Add all words from the game's word list
    GAME_DATA.word_list.forEach(word => {
        systemWords.add(word.toLowerCase());
        count++;
    });
    console.log(`Added ${count} words from game data`);
    
    // Add all related words from all puzzles
    Object.values(GAME_DATA.words).forEach(wordData => {
        wordData.related_words.forEach(word => {
            systemWords.add(word.toLowerCase());
            count++;
        });
    });
    console.log(`Added ${count} total words from game data and related words`);
    
    // Add all system words
    SYSTEM_WORDS.forEach(word => {
        systemWords.add(word.toLowerCase());
    });
    console.log(`Added ${SYSTEM_WORDS.size} words from system_words.js`);
    console.log(`Total system words: ${systemWords.size}`);
}

// Count non-English words in the tree
function countNonEnglishWords(tree) {
    let count = 0;
    
    function traverse(node) {
        if (!node) return;
        
        // Check current node - only count if it's non-English and not revealed
        if (node.lang !== 'en' && !revealedNodes.has(node.word)) {
            count++;
        }
        
        // Traverse children
        if (node.children) {
            node.children.forEach(traverse);
        }
    }
    
    // Start traversal from the root
    traverse(tree);
    return count;
}

// Count English words in the tree
function countEnglishWords(tree) {
    let count = 0;
    function traverse(node) {
        if (!node) return;
        // Handle both raw tree data and D3 hierarchy nodes
        const nodeData = node.data || node;
        if (!nodeData) return;
        
        // Count all English words except the clue word
        if (nodeData.lang === 'en' && nodeData.word !== currentWord) {
            count++;
        }
        
        // Handle both raw tree data and D3 hierarchy nodes
        const children = node.children || nodeData.children;
        if (children) {
            children.forEach(traverse);
        }
    }
    traverse(tree);
    return count;
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
    
    // Filter out already revealed nodes, the clue word, correct answers, and English nodes
    const unrevealedNodes = allNodes.filter(node => 
        node.data && 
        node.data.word && 
        !revealedNodes.has(node.data.word) && 
        node.data.word !== currentWord &&
        !GAME_DATA.words[currentWord].related_words.includes(node.data.word) &&
        node.data.lang !== 'en'  // Only consider non-English nodes
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
    
    // Create SVG with zoom behavior
    const svg = d3.select(treeContainer)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .call(d3.zoom()
            .scaleExtent([0.5, 3]) // Limit zoom scale
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            }))
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create a group for all tree elements
    const g = svg.append('g');
    
    // Draw links - only between revealed nodes
    g.selectAll('.link')
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
    const node = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .style('opacity', d => shouldRevealNode(d) ? 1 : 0); // Hide unrevealed nodes

    // Add touch event handlers for nodes
    node.on('touchstart', function(event, d) {
        event.preventDefault(); // Prevent default touch behavior
        if (shouldRevealNode(d)) {
            showTooltip(event, d);
        }
    })
    .on('touchend', function() {
        hideTooltip();
    });

    // Add circles to nodes
    node.append('circle')
        .attr('r', 5)
        .attr('fill', d => {
            if (shouldRevealNode(d)) {
                return d.data.lang === 'en' ? '#ffd700' : '#fff';
            }
            return '#444';
        });

    // Add text labels
    node.append('text')
        .attr('dy', '.31em')
        .attr('x', d => d.children ? -6 : 6)
        .attr('text-anchor', d => d.children ? 'end' : 'start')
        .attr('fill', d => {
            if (!shouldRevealNode(d)) {
                return '#666';
            }
            return d.data.lang === 'en' ? '#ffd700' : '#fff';
        })
        .attr('font-weight', d => (d.data.lang === 'en') ? 'bold' : 'normal')
        .text(d => {
            if (shouldRevealNode(d)) {
                return d.data.lang === 'en' ? d.data.word : anglicizeWord(d.data.word);
            }
            return '?';
        })
        .on('mouseover', function(event, d) {
            if (shouldRevealNode(d)) {
                let tooltipText = '';
                if (d.data.lang !== 'en') {
                    tooltipText += `Anglicized: ${d.data.anglicized}<br>`;
                }
                tooltipText += `Language: ${d.data.lang}<br>`;
                if (d.data.gloss) {
                    tooltipText += `Meaning: ${d.data.gloss}`;
                }
                
                tooltip
                    .html(tooltipText)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px')
                    .transition()
                    .duration(200)
                    .style('opacity', 0.9);
            }
        })
        .on('mouseout', function() {
            tooltip
                .transition()
                .duration(500)
                .style('opacity', 0);
        });

    // Add touch event handlers for the container
    treeContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    treeContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    treeContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
}

// Touch gesture handling
let touchStartX = 0;
let touchStartY = 0;
let lastTouchX = 0;
let lastTouchY = 0;
let isPanning = false;

function handleTouchStart(event) {
    if (event.touches.length === 1) {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        lastTouchX = touchStartX;
        lastTouchY = touchStartY;
        isPanning = true;
    }
}

function handleTouchMove(event) {
    if (!isPanning) return;
    
    event.preventDefault();
    
    const touchX = event.touches[0].clientX;
    const touchY = event.touches[0].clientY;
    
    const deltaX = touchX - lastTouchX;
    const deltaY = touchY - lastTouchY;
    
    // Update the transform of the tree group
    const g = d3.select('#tree-container svg g');
    const currentTransform = d3.zoomTransform(g.node());
    g.attr('transform', `translate(${currentTransform.x + deltaX},${currentTransform.y + deltaY}) scale(${currentTransform.k})`);
    
    lastTouchX = touchX;
    lastTouchY = touchY;
}

function handleTouchEnd() {
    isPanning = false;
}

// Check if all English words have been guessed
function checkWinCondition() {
    const root = d3.hierarchy(treeData);
    const englishWords = new Set();
    
    function traverse(node) {
        if (!node || !node.data) return;
        if (node.data.lang === 'en') {
            englishWords.add(node.data.word);
        }
        if (node.children) {
            node.children.forEach(traverse);
        }
    }
    traverse(root);
    
    // Check if all English words have been guessed
    return Array.from(englishWords).every(word => guessedWords.has(word));
}

// Create confetti effect for win
function createConfetti() {
    const colors = ['#ffd700', '#c4a484', '#8b7355', '#b5651d'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        document.body.appendChild(confetti);
        
        // Remove confetti after animation
        setTimeout(() => confetti.remove(), 3000);
    }
}

// Handle game over state
function handleGameOver(isWin) {
    gameOver = true;
    const container = document.querySelector('.container');
    container.classList.add('game-over');
    
    // Reveal the entire tree
    allWordsRevealed = true;
    renderTree();
    
    // Show score overlay
    const scoreOverlay = document.getElementById('score-overlay');
    const finalTitle = document.getElementById('final-title');
    const finalScore = document.getElementById('final-score');
    const finalWords = document.getElementById('final-words');
    const wordsFoundCount = document.getElementById('words-found-count');
    const incorrectGuessesCount = document.getElementById('incorrect-guesses-count');
    
    if (isWin) {
        container.classList.add('win-animation');
        createConfetti();
        finalTitle.textContent = 'Congratulations!';
        finalScore.textContent = 'You won!';
        finalScore.className = 'correct';
    } else {
        container.classList.add('lose-animation');
        finalTitle.textContent = 'Game Over';
        finalScore.textContent = 'Better luck next time!';
        finalScore.className = 'incorrect';
    }
    
    // Update score stats
    const foundWords = Array.from(guessedWords).sort();
    wordsFoundCount.textContent = foundWords.length;
    incorrectGuessesCount.textContent = incorrectGuesses;
    
    // Show all found words
    finalWords.innerHTML = `<p>Words found: ${foundWords.join(', ')}</p>`;
    
    // Show the overlay
    scoreOverlay.classList.remove('hidden');
    
    // Disable input and buttons
    document.getElementById('guess-input').disabled = true;
    document.getElementById('guess-button').disabled = true;
    
    // Set up share results button
    const shareButton = document.getElementById('share-results');
    shareButton.onclick = () => {
        // Create a more elegant score representation
        const scoreLine = isWin 
            ? `📚 ${foundWords.length}/${totalEnglishWords + 1} words found`
            : `💩 ${foundWords.length}/${totalEnglishWords + 1} words found`;
        
        const guessesLine = `🍋 ${incorrectGuesses} incorrect guesses`;
        
        const shareText = `Etymol\nClue: ${currentWord}\n${scoreLine}\n${guessesLine}\nhttps://etymol.co.uk`;
        
        navigator.clipboard.writeText(shareText).then(() => {
            // Show feedback
            const originalText = shareButton.textContent;
            shareButton.textContent = 'Copied!';
            shareButton.disabled = true;
            setTimeout(() => {
                shareButton.textContent = originalText;
                shareButton.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    // Set up view tree button
    const viewTreeButton = document.getElementById('view-tree');
    viewTreeButton.onclick = () => {
        // Hide the score overlay
        scoreOverlay.classList.add('hidden');
        // Remove game over state to allow interaction with the tree
        container.classList.remove('game-over');
        // Enable zoom and pan interactions
        const svg = d3.select('#tree-container svg');
        svg.call(d3.zoom()
            .scaleExtent([0.5, 3])
            .on('zoom', (event) => {
                svg.select('g').attr('transform', event.transform);
            }));
    };
}

// Update score display
function updateScoreDisplay() {
    const guessesContainer = document.getElementById('guesses-container');
    guessesContainer.innerHTML = ''; // Clear existing dots
    
    // Create dots for remaining guesses
    for (let i = 0; i < maxIncorrectGuesses; i++) {
        const dot = document.createElement('div');
        // If this dot's index is in the last 'incorrectGuesses' positions, it should be dimmed
        dot.className = `guess-dot${i >= (maxIncorrectGuesses - incorrectGuesses) ? ' used' : ''}`;
        guessesContainer.appendChild(dot);
    }
}

// Update remaining words display
function updateWordsDisplay() {
    const progressBar = document.getElementById('words-progress');
    const totalEnglishWords = countEnglishWords(treeData);
    const guessedWordsCount = guessedWords.size - 1; // Exclude clue word
    const progress = (guessedWordsCount / totalEnglishWords) * 100;
    
    console.log('Progress calculation:', {
        totalEnglishWords,
        guessedWordsCount,
        progress,
        guessedWords: Array.from(guessedWords),
        currentWord
    });
    
    progressBar.style.width = `${progress}%`;
}

// Handle word guesses
function handleGuess() {
    if (gameOver) return;
    
    const guessInput = document.getElementById('guess-input');
    const guess = guessInput.value.toLowerCase().trim();
    const guessContainer = document.querySelector('.guess-container');
    const feedback = document.getElementById('feedback');
    
    if (!guess) return;
    
    // Remove any existing animation classes
    guessContainer.classList.remove('shake', 'pulse');
    feedback.classList.remove('show');
    
    // Force a reflow to ensure the animation can be triggered again
    void guessContainer.offsetWidth;
    
    if (guessedWords.has(guess)) {
        // Already guessed - shake the input
        guessContainer.classList.add('shake');
        feedback.textContent = 'Already guessed!';
        feedback.className = 'incorrect';
        feedback.classList.add('show');
    } else if (GAME_DATA.words[currentWord].related_words.includes(guess)) {
        // Correct guess - pulse the input
        guessContainer.classList.add('pulse');
        feedback.textContent = 'Correct!';
        feedback.className = 'correct';
        feedback.classList.add('show');
        
        guessedWords.add(guess);
        updateWordsDisplay();
        
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
        
        // Reveal all nodes in the path
        if (path) {
            path.forEach(node => {
                if (node.data && node.data.word) {
                    revealedNodes.add(node.data.word);
                }
            });
        }
        
        // Also reveal the guessed word itself
        revealedNodes.add(guess);
        
        renderTree();
        
        // Check for win condition
        if (checkWinCondition()) {
            handleGameOver(true);
        }
    } else {
        // Incorrect guess - shake the input
        guessContainer.classList.add('shake');
        feedback.textContent = 'Try again!';
        feedback.className = 'incorrect';
        feedback.classList.add('show');
        
        // Increment incorrect guesses
        incorrectGuesses++;
        updateScoreDisplay();
        
        // Try to reveal one more node for incorrect guess
        const nextNode = getNextNodeToReveal();
        if (nextNode) {
            revealedNodes.add(nextNode.data.word);
            renderTree();
        }
        
        // Check for loss condition
        if (incorrectGuesses >= maxIncorrectGuesses) {
            handleGameOver(false);
        }
    }
    
    // Clear input and refocus
    guessInput.value = '';
    guessInput.focus();
    
    // Hide suggestions
    hideSuggestions();
}

// Handle guess input changes
function handleGuessInput(event) {
    const guessInput = event.target;
    const searchTerm = guessInput.value.toLowerCase().trim();
    
    if (searchTerm.length < 2) {
        hideSuggestions();
        return;
    }
    
    console.log(`Searching for "${searchTerm}" in ${systemWords.size} system words`);
    
    // Filter valid words that haven't been guessed
    suggestions = Array.from(systemWords)
        .filter(word => {
            const matches = word.includes(searchTerm);
            const notGuessed = !guessedWords.has(word);
            if (matches && !notGuessed) {
                console.log(`Word "${word}" matches but was already guessed`);
            }
            return matches && notGuessed;
        })
        .sort((a, b) => {
            // Sort by whether the word is in the current puzzle's related words
            const aIsRelated = GAME_DATA.words[currentWord].related_words.includes(a);
            const bIsRelated = GAME_DATA.words[currentWord].related_words.includes(b);
            if (aIsRelated && !bIsRelated) return -1;
            if (!aIsRelated && bIsRelated) return 1;
            return a.localeCompare(b);
        })
        .slice(0, 10); // Limit to 10 suggestions
    
    console.log(`Found ${suggestions.length} suggestions:`, suggestions);
    
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
    
    // Calculate total English words
    totalEnglishWords = countEnglishWords(treeData);
    
    // Add the clue word to guessed words (it's pre-revealed)
    guessedWords.add(currentWord);
    
    // Display the clue word
    document.getElementById('clue-word').textContent = currentWord;
    
    // Create tooltip div (only once)
    tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'fixed')
        .style('background-color', 'rgba(0, 0, 0, 0.9)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('pointer-events', 'none')
        .style('z-index', '1000')
        .style('transform', 'translate(-50%, -100%)')
        .style('margin-top', '-10px')
        .style('display', 'block');
    
    // Load system words
    loadSystemWords();
    
    // Initialize revealed nodes with the path from root to clue word
    initializeRevealedNodes();
    
    // Calculate max incorrect guesses (number of unrevealed non-English words)
    maxIncorrectGuesses = countNonEnglishWords(treeData);
    
    // Create stats container
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';

    // Create and append guesses container (dots)
    const guessesContainer = document.createElement('div');
    guessesContainer.id = 'guesses-container';
    statsContainer.appendChild(guessesContainer);

    // Create and append progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.id = 'words-progress';
    progressContainer.appendChild(progressBar);
    statsContainer.appendChild(progressContainer);

    // Insert stats container before feedback
    const feedback = document.getElementById('feedback');
    feedback.parentNode.insertBefore(statsContainer, feedback);
    
    // Initialize the display
    updateScoreDisplay();
    updateWordsDisplay();
    
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
    
    // Set up overlay buttons
    document.getElementById('start-game').addEventListener('click', () => {
        document.getElementById('instructions-overlay').classList.add('hidden');
        gameStarted = true;
        // Enable game interaction
        document.getElementById('guess-input').disabled = false;
        document.getElementById('guess-button').disabled = false;
        // Remove automatic focus to let users look at the map first
    });
    
    // Initially disable game interaction until instructions are read
    guessInput.disabled = true;
    document.getElementById('guess-button').disabled = true;
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