# Etymol

A word game where you guess related words in an etymology tree.

## Testing Parameters

You can use URL parameters to test different words in the game:

### Random Word
To get a random word for testing:
```
http://localhost:8000/index.html?word=random
```

### Specific Word
To test with a specific word:
```
http://localhost:8000/index.html?word=sour
```

### Default
If no parameter is provided, the game uses the first word in the list:
```
http://localhost:8000/index.html
```

## Game Rules
1. You start with a clue word
2. Try to guess other English words that appear in the etymology tree
3. Correct guesses reveal parts of the tree
4. The goal is to discover all the English words in the tree

## Development
- `build_trees.py`: Generates the game data from etymology database
- `game.js`: Main game logic and tree visualization
- `game_data.js`: Contains all the word trees and related words

