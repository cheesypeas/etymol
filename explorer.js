// Explorer state
let currentWord;
let tooltip;
let searchResults = [];
let selectedIndex = -1;

// Initialize the explorer
function initExplorer() {
    // Create tooltip div
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
    
    // Set up search functionality
    const searchInput = document.getElementById('search-input');
    const searchGo = document.getElementById('search-go');
    
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('keydown', handleSearchKeydown);
    searchGo.addEventListener('click', handleGoButton);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer.contains(event.target)) {
            hideSearchResults();
        }
    });
    
    // Show first word by default
    if (EXPLORER_DATA.word_list.length > 0) {
        showWord(EXPLORER_DATA.word_list[0]);
    }
}

// Handle Go button click
function handleGoButton() {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm.length < 2) {
        showError('Please enter at least 2 characters');
        return;
    }
    
    // Hide any existing search results
    hideSearchResults();
    
    // Try to find the exact word
    showWord(searchTerm);
}

// Handle search input
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    if (searchTerm.length < 2) {
        hideSearchResults();
        return;
    }
    
    // Find matching words in all trees
    searchResults = [];
    const seenWords = new Set(); // Track unique words to handle duplicates
    
    for (const [clueWord, data] of Object.entries(EXPLORER_DATA.words)) {
        // Add clue word if it matches
        if (clueWord.toLowerCase().includes(searchTerm) && !seenWords.has(clueWord)) {
            searchResults.push(clueWord);
            seenWords.add(clueWord);
        }
        
        // Add related words if they match
        for (const word of data.related_words) {
            if (word.toLowerCase().includes(searchTerm) && !seenWords.has(word)) {
                searchResults.push(word);
                seenWords.add(word);
            }
        }
    }
    
    if (searchResults.length > 0) {
        showSearchResults(searchResults);
    } else {
        hideSearchResults();
        showError(`No words found matching "${searchTerm}"`);
    }
}

// Handle keyboard navigation in search
function handleSearchKeydown(event) {
    const searchResultsDiv = document.querySelector('.search-results');
    if (!searchResultsDiv) return;
    
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, searchResults.length - 1);
            updateSelectedResult();
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelectedResult();
            break;
            
        case 'Enter':
            event.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
                showWord(searchResults[selectedIndex]);
                hideSearchResults();
            }
            break;
            
        case 'Escape':
            hideSearchResults();
            break;
    }
}

// Show search results in dropdown
function showSearchResults(results) {
    // Remove existing results
    hideSearchResults();
    
    // Create results container
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'search-results';
    
    // Add result items
    results.forEach((word, index) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.textContent = word;
        item.addEventListener('click', () => {
            showWord(word);
            hideSearchResults();
        });
        resultsDiv.appendChild(item);
    });
    
    // Add to DOM
    document.querySelector('.search-container').appendChild(resultsDiv);
    
    // Reset selection
    selectedIndex = -1;
}

// Update the selected result in the dropdown
function updateSelectedResult() {
    const items = document.querySelectorAll('.search-result-item');
    items.forEach((item, index) => {
        item.style.background = index === selectedIndex ? '#333' : '';
    });
}

// Hide search results dropdown
function hideSearchResults() {
    const resultsDiv = document.querySelector('.search-results');
    if (resultsDiv) {
        resultsDiv.remove();
    }
    selectedIndex = -1;
}

// Show error message
function showError(message) {
    const searchContainer = document.querySelector('.search-container');
    const existingError = searchContainer.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.style.color = '#ff6b6b';
    errorMessage.style.marginTop = '8px';
    errorMessage.textContent = message;
    searchContainer.appendChild(errorMessage);
}

// Show a word's trees
function showWord(word) {
    // Find all trees containing this word
    const matchingTrees = [];
    
    // First check if it's a clue word
    if (EXPLORER_DATA.words[word]) {
        matchingTrees.push({
            clueWord: word,
            data: EXPLORER_DATA.words[word]
        });
    }
    
    // Search through all trees to find ones containing this word
    for (const [clueWord, data] of Object.entries(EXPLORER_DATA.words)) {
        if (data.related_words.includes(word) && clueWord !== word) {
            matchingTrees.push({
                clueWord: clueWord,
                data: data
            });
        }
    }
    
    if (matchingTrees.length === 0) {
        showError(`Could not find tree containing "${word}"`);
        return;
    }
    
    // If multiple trees found, show selector
    if (matchingTrees.length > 1) {
        showTreeSelector(word, matchingTrees);
    } else {
        // Single tree found, show it directly
        displayTree(matchingTrees[0].clueWord, matchingTrees[0].data);
    }
}

// Show tree selector UI when multiple trees are found
function showTreeSelector(word, trees) {
    // Remove existing selector if any
    const existingSelector = document.querySelector('.tree-selector');
    if (existingSelector) {
        existingSelector.remove();
    }
    
    // Create selector container
    const selector = document.createElement('div');
    selector.className = 'tree-selector';
    selector.style.position = 'fixed';
    selector.style.top = '50%';
    selector.style.left = '50%';
    selector.style.transform = 'translate(-50%, -50%)';
    selector.style.background = '#222';
    selector.style.padding = '20px';
    selector.style.borderRadius = '8px';
    selector.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    selector.style.zIndex = '1000';
    
    // Add title
    const title = document.createElement('h3');
    title.textContent = `"${word}" appears in multiple trees. Select one to view:`;
    title.style.margin = '0 0 15px 0';
    title.style.color = '#fff';
    selector.appendChild(title);
    
    // Add tree options
    const optionsList = document.createElement('ul');
    optionsList.style.listStyle = 'none';
    optionsList.style.padding = '0';
    optionsList.style.margin = '0';
    
    trees.forEach(({clueWord, data}) => {
        const li = document.createElement('li');
        li.style.margin = '10px 0';
        
        const button = document.createElement('button');
        // Get the root word from the unfiltered tree
        const rootWord = data.unfiltered_tree.word;
        const rootLang = data.unfiltered_tree.lang;
        button.textContent = `Tree from ${rootWord} (${rootLang})`;
        button.style.width = '100%';
        button.style.padding = '8px';
        button.style.background = '#444';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.color = '#fff';
        button.style.cursor = 'pointer';
        
        button.addEventListener('mouseover', () => {
            button.style.background = '#555';
        });
        
        button.addEventListener('mouseout', () => {
            button.style.background = '#444';
        });
        
        button.addEventListener('click', () => {
            selector.remove();
            displayTree(clueWord, data);
        });
        
        li.appendChild(button);
        optionsList.appendChild(li);
    });
    
    selector.appendChild(optionsList);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Cancel';
    closeButton.style.marginTop = '15px';
    closeButton.style.padding = '8px 16px';
    closeButton.style.background = '#666';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.color = '#fff';
    closeButton.style.cursor = 'pointer';
    
    closeButton.addEventListener('click', () => {
        selector.remove();
    });
    
    selector.appendChild(closeButton);
    
    // Add to DOM
    document.body.appendChild(selector);
}

// Display a specific tree
function displayTree(clueWord, treeData) {
    currentWord = clueWord;
    
    // Render both trees
    renderTree('unfiltered-tree-container', treeData.unfiltered_tree, true);
    renderTree('filtered-tree-container', treeData.filtered_tree, false);
    
    // Update stats
    updateStats('unfiltered-stats', treeData.unfiltered_tree);
    updateStats('filtered-stats', treeData.filtered_tree);
}

// Calculate tree statistics
function calculateTreeStats(tree) {
    const stats = {
        totalNodes: 0,
        englishNodes: 0,
        otherLanguages: new Set(),
        maxDepth: 0,
        branchPoints: 0
    };
    
    function traverse(node, depth = 0) {
        stats.totalNodes++;
        if (node.data.lang === 'en') {
            stats.englishNodes++;
        } else {
            stats.otherLanguages.add(node.data.lang);
        }
        stats.maxDepth = Math.max(stats.maxDepth, depth);
        
        if (node.children && node.children.length > 1) {
            stats.branchPoints++;
        }
        
        if (node.children) {
            node.children.forEach(child => traverse(child, depth + 1));
        }
    }
    
    traverse(tree);
    return stats;
}

// Update statistics display
function updateStats(elementId, tree) {
    const stats = calculateTreeStats(tree);
    const statsElement = document.getElementById(elementId);
    
    statsElement.innerHTML = `
        Total nodes: ${stats.totalNodes}<br>
        English words: ${stats.englishNodes}<br>
        Other languages: ${stats.otherLanguages.size}<br>
        Max depth: ${stats.maxDepth}<br>
        Branch points: ${stats.branchPoints}<br>
        Score: ${EXPLORER_DATA.words[currentWord].score}
    `;
}

// Render a tree using D3
function renderTree(containerId, treeData, isUnfiltered) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear previous tree
    
    // Set dimensions and margins
    const margin = {top: 20, right: 90, bottom: 30, left: 90};
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;
    
    // Create the tree layout
    const treeLayout = d3.tree().size([height, width]);
    const root = d3.hierarchy(treeData);
    treeLayout(root);
    
    // Create SVG
    const svg = d3.select(container)
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
        .attr('fill', d => d.data.lang === 'en' ? '#ffd700' : '#fff');
    
    // Add text labels
    node.append('text')
        .attr('dy', '1.5em')
        .attr('x', d => d.children ? -9 : 9)
        .attr('text-anchor', d => d.children ? 'end' : 'start')
        .attr('fill', d => d.data.lang === 'en' ? '#ffd700' : '#fff')
        .attr('font-weight', d => d.data.lang === 'en' ? 'bold' : 'normal')
        .text(d => d.data.lang !== 'en' ? d.data.anglicized : d.data.word)
        // Add tooltip behavior
        .on('mouseover', function(event, d) {
            if (d.data.gloss) {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                tooltip.html(`
                    Word: ${d.data.word}<br>
                    Language: ${d.data.lang}<br>
                    Gloss: ${d.data.gloss}
                `)
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

// Initialize the explorer when the page loads
document.addEventListener('DOMContentLoaded', initExplorer); 