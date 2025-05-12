import csv
import json
import requests
import random
import argparse
import os
import unicodedata
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional

# Type aliases for clarity
WordData = Tuple[str, str, str]  # (lang, word, gloss)
Relationships = Dict[int, List[Tuple[int, str]]]  # child_idx -> [(parent_idx, rel_type), ...]
MultiParents = Dict[int, List[int]]  # neg_idx -> [parent1, parent2, ...]
Tree = Dict[str, any]  # Our tree structure

def download_word_frequencies():
    """Download word frequency data from Google Books Ngram dataset."""
    url = "https://raw.githubusercontent.com/IlyaSemenov/wikipedia-word-frequency/master/results/enwiki-2023-04-13.txt"
    response = requests.get(url)
    if response.status_code == 200:
        with open('word_frequencies.txt', 'w') as f:
            f.write(response.text)
        print("Downloaded word frequencies")
    else:
        print("Failed to download word frequencies")
        return None

def load_word_frequencies() -> Dict[str, float]:
    """Load word frequencies from file."""
    frequencies = {}
    try:
        with open('word_frequencies.txt', 'r') as f:
            for line in f:
                word, freq = line.strip().split()
                frequencies[word.lower()] = float(freq)
        print(f"Loaded {len(frequencies)} word frequencies")
        return frequencies
    except FileNotFoundError:
        print("Word frequency file not found, downloading...")
        download_word_frequencies()
        return load_word_frequencies()

def anglicize_word(word: str) -> str:
    """Convert a word to its anglicized form."""
    return unicodedata.normalize('NFD', word.lower()).encode('ascii', 'ignore').decode('ascii')

class EtymologyDB:
    def __init__(self):
        self.word_data: Dict[int, WordData] = {}
        self.relationships: Relationships = defaultdict(list)
        self.multi_parents: MultiParents = {}
        self.child_relationships: Relationships = defaultdict(list)  # parent_idx -> [(child_idx, rel_type), ...]
        self.word_frequencies = load_word_frequencies()
        
    def load_data(self):
        """Load all data from the split etymdb files."""
        # Load word data
        with open('data/split_etymdb/etymdb_values.csv') as f:
            for line in f:
                parts = line.strip().split('\t')
                if len(parts) != 5:  # Skip malformed lines
                    continue
                idx = int(parts[0])
                lang = parts[1]
                word = parts[3]
                gloss = parts[4]
                self.word_data[idx] = (lang, word, gloss)
        
        # Load direct relationships
        with open('data/split_etymdb/etymdb_links_info.csv') as f:
            for line in f:
                rel_type, child_idx, parent_idx = line.strip().split('\t')
                child_idx = int(child_idx)
                parent_idx = int(parent_idx)
                self.relationships[child_idx].append((parent_idx, rel_type))
                self.child_relationships[parent_idx].append((child_idx, rel_type))
        
        # Load multiple parent cases
        with open('data/split_etymdb/etymdb_links_index.csv') as f:
            for line in f:
                neg_idx, *parents = map(int, line.strip().split('\t'))
                self.multi_parents[neg_idx] = parents

    def build_tree(self, start_idx: int, visited: Optional[Set[int]] = None) -> Optional[Tree]:
        """Build a tree starting from any word index."""
        if visited is None:
            visited = set()
        
        if start_idx in visited:
            return None  # Prevent cycles
        
        if start_idx not in self.word_data:
            return None
        
        visited.add(start_idx)
        
        # Get word data
        lang, word, gloss = self.word_data[start_idx]
        
        # Build children
        children = []
        for child_idx, rel_type in self.child_relationships[start_idx]:
            if rel_type == 'inh':  # inheritance relationship
                child_tree = self.build_tree(child_idx, visited.copy())
                if child_tree:
                    children.append(child_tree)
        
        return {
            'word': word,
            'anglicized': anglicize_word(word) if lang != 'en' else word,
            'lang': lang,
            'gloss': gloss,
            'children': children
        }

    def score_tree(self, tree: Tree) -> Tuple[float, bool]:
        """Score a tree based on various factors. Returns (score, is_valid)."""
        if not tree:
            return 0.0, False
        
        score = 0.0
        languages = set()
        english_count = 0
        total_nodes = 0
        max_branches = 0  # Track maximum number of branches at any level
        branch_points = 0  # Count nodes with 2+ children
        is_linear = True  # Track if tree is strictly linear
        
        def traverse(t: Tree, current_branches: int = 0):
            nonlocal score, languages, english_count, total_nodes, max_branches, branch_points, is_linear
            if not t:
                return
            
            total_nodes += 1
            languages.add(t['lang'])
            if t['lang'] == 'en':
                english_count += 1
            
            # Update branch statistics
            if len(t['children']) > 0:
                current_branches = len(t['children'])
                max_branches = max(max_branches, current_branches)
                if current_branches >= 2:
                    branch_points += 1
                    is_linear = False
            
            for child in t['children']:
                traverse(child, current_branches)
        
        traverse(tree)
        
        # Hard minimums
        if total_nodes < 5:  # Require at least 5 nodes
            return 0.0, False
        if is_linear:  # Reject strictly linear trees
            return 0.0, False
        if branch_points < 1:  # Require at least 3 branching points
            return 0.0, False
        if english_count < 4:  # Require at least 4 English words
            return 0.0, False
        
        # Scoring factors:
        # 1. Number of languages (more variety is better)
        score += len(languages) * 2
        
        # 2. Presence of English words (but not too many)
        if english_count < total_nodes * 0.7:  # Not too many English words
            score += english_count
        
        # 3. Tree size (not too small, not too large)
        if 5 <= total_nodes <= 12:  # Increased minimum size
            score += total_nodes
        else:
            score -= abs(total_nodes - 8)  # Penalize trees that are too small or too large
        
        # 4. Branch diversity
        score += branch_points * 2.0  # Each branching point adds 2 points
        score += max_branches * 1.5   # Each additional branch at max level adds 1.5 points
        
        return score, True

    def find_interesting_trees(self, min_score: float = 5.0) -> List[Tuple[str, Tree, float]]:
        """Find interesting trees by building from each word and scoring them."""
        interesting_trees = []
        total_trees = 0
        rejected_trees = 0
        rejection_reasons = defaultdict(int)
        
        for idx, (lang, word, _) in self.word_data.items():
            tree = self.build_tree(idx)
            if tree:
                total_trees += 1
                score, is_valid = self.score_tree(tree)
                if is_valid and score >= min_score:
                    interesting_trees.append((word, tree, score))
                else:
                    rejected_trees += 1
                    # Track rejection reasons
                    if not tree:
                        rejection_reasons['no_tree'] += 1
                    elif score < min_score:
                        rejection_reasons['low_score'] += 1
                    else:
                        rejection_reasons['invalid'] += 1
        
        # Sort by score
        interesting_trees.sort(key=lambda x: x[2], reverse=True)
        
        print(f"\nTree Statistics:")
        print(f"Total trees built: {total_trees}")
        print(f"Rejected trees: {rejected_trees}")
        print(f"Accepted trees: {len(interesting_trees)}")
        print("\nRejection reasons:")
        for reason, count in rejection_reasons.items():
            print(f"  {reason}: {count}")
        
        return interesting_trees

def collect_english_words(tree: Tree) -> Set[str]:
    """Collect all English words from a tree."""
    english_words = set()
    
    def traverse(t: Tree):
        if not t:
            return
        if t['lang'] == 'en':
            english_words.add(t['word'])
        for child in t['children']:
            traverse(child)
    
    traverse(tree)
    return english_words

def get_most_common_english_word(tree: Tree, word_frequencies: Dict[str, float]) -> str:
    """Get the most common English word in the tree based on frequency data."""
    english_words = collect_english_words(tree)
    if not english_words:
        return tree['word']  # Fallback to root word if no English words
    
    # Find the most frequent English word
    most_common = max(english_words, key=lambda w: word_frequencies.get(w.lower(), 0))
    return most_common

def output_game_data(trees: List[Tuple[str, Tree, float]], word_frequencies: Dict[str, float]) -> Dict:
    """Convert trees to game data format."""
    game_data = {
        "words": {},
        "word_list": []
    }
    
    for word, tree, score in trees:
        english_words = collect_english_words(tree)
        if not english_words:  # Skip trees with no English words
            continue
            
        # Get the most common English word
        clue_word = get_most_common_english_word(tree, word_frequencies)
        
        # Add to game data using the English word as the key
        game_data["words"][clue_word] = {
            "tree": tree,
            "related_words": sorted(list(english_words))  # Sort for consistency
        }
        game_data["word_list"].append(clue_word)
    
    # Sort word list for consistency
    game_data["word_list"].sort()
    
    return game_data

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Build etymology trees for the game.')
    parser.add_argument('--random', action='store_true', help='Print a random clue word for testing')
    args = parser.parse_args()

    # Clear old data files
    print("Clearing old data files...")
    for file in ['game_data.js', 'word_frequencies.txt']:
        try:
            os.remove(file)
            print(f"Removed {file}")
        except FileNotFoundError:
            pass

    db = EtymologyDB()
    print("Loading data...")
    db.load_data()
    print("Finding interesting trees...")
    trees = db.find_interesting_trees()
    
    # Generate game data
    print("\nGenerating game data...")
    game_data = output_game_data(trees, db.word_frequencies)
    
    # Save to file
    print("Saving to game_data.js...")
    with open('game_data.js', 'w') as f:
        f.write('const GAME_DATA = ')
        json.dump(game_data, f, indent=2)
        f.write(';')
    
    # If --random flag is set, print a random clue word
    if args.random:
        random_word = random.choice(list(game_data["words"].keys()))
        print(f"\nRandom clue word for testing: {random_word}")
        print("\nTree structure:")
        print_tree(game_data["words"][random_word]["tree"])
        print("\nRelated words:", game_data["words"][random_word]["related_words"])
    
    print("Done!")

def print_tree(tree: Tree, level: int = 0):
    """Helper function to print a tree structure."""
    if not tree:
        return
    
    indent = "  " * level
    print(f"{indent}{tree['word']} ({tree['lang']}) - {tree['gloss']}")
    for child in tree['children']:
        print_tree(child, level + 1)

if __name__ == "__main__":
    main() 