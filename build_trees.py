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

def load_valid_words() -> Set[str]:
    """Load words from system word list."""
    words = set()
    try:
        # Try common system word lists
        word_lists = [
            '/usr/share/dict/words',  # Common on Linux
            '/usr/dict/words',        # Alternative location
            '/usr/share/dict/american-english',  # Debian/Ubuntu
            '/usr/share/dict/british-english'    # Debian/Ubuntu
        ]
        
        for word_list in word_lists:
            try:
                with open(word_list, 'r') as f:
                    for line in f:
                        word = line.strip().lower()
                        # Only include words that are likely valid English words
                        if word.isalpha() and len(word) >= 2:
                            words.add(word)
                print(f"Loaded {len(words)} words from {word_list}")
                return words
            except FileNotFoundError:
                continue
        
        print("No system word list found, using empty set")
        return set()
    except Exception as e:
        print(f"Error loading word list: {str(e)}")
        return set()

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
        self.valid_words = load_valid_words()  # Updated function name
        
    def get_relationship_direction(self, rel_type: str, child_idx: int, parent_idx: int) -> Tuple[int, int]:
        """Determine the correct direction of a relationship."""
        if rel_type in ['inh', 'der', 'der(s)', 'der(p)', 'bor', 'cmpd+bor']:
            return parent_idx, child_idx  # parent → child
        elif rel_type == 'cog':
            return child_idx, parent_idx  # bidirectional
        else:
            return child_idx, parent_idx  # default direction

    def resolve_multiple_parents(self, child_idx: int, parent_idx: int) -> List[int]:
        """Resolve cases where a word has multiple parents."""
        if parent_idx < 0 and parent_idx in self.multi_parents:
            return self.multi_parents[parent_idx]
        return [parent_idx]

    def validate_word_data(self, idx: int, lang: str, word: str, gloss: str) -> bool:
        """Validate word data before adding to database."""
        if not lang or not word:
            return False
        if not isinstance(idx, int) or idx < 0:
            return False
        return True

    def validate_relationship(self, rel_type: str, child_idx: int, parent_idx: int) -> bool:
        """Validate relationship data before adding to database."""
        valid_types = {'inh', 'der', 'der(s)', 'der(p)', 'bor', 'cog', 'cmpd+bor'}
        if rel_type not in valid_types:
            return False
        if not isinstance(child_idx, int) or not isinstance(parent_idx, int):
            return False
        return True

    def load_data(self):
        """Load all data from the split etymdb files."""
        # Load word data
        with open('data/split_etymdb/etymdb_values.csv') as f:
            for line in f:
                parts = line.strip().split('\t')
                if len(parts) != 5:  # Skip malformed lines
                    continue
                try:
                    idx = int(parts[0])
                    lang = parts[1]
                    word = parts[3]
                    gloss = parts[4]
                    if self.validate_word_data(idx, lang, word, gloss):
                        self.word_data[idx] = (lang, word, gloss)
                except (ValueError, IndexError):
                    continue
        
        # Load direct relationships
        with open('data/split_etymdb/etymdb_links_info.csv') as f:
            for line in f:
                try:
                    rel_type, child_idx, parent_idx = line.strip().split('\t')
                    child_idx = int(child_idx)
                    parent_idx = int(parent_idx)
                    
                    if not self.validate_relationship(rel_type, child_idx, parent_idx):
                        continue
                    
                    # Handle multiple parents
                    parent_indices = self.resolve_multiple_parents(child_idx, parent_idx)
                    
                    for parent_idx in parent_indices:
                        # Determine correct relationship direction
                        source_idx, target_idx = self.get_relationship_direction(rel_type, child_idx, parent_idx)
                        
                        # Add relationship in both directions for easier traversal
                        self.relationships[target_idx].append((source_idx, rel_type))
                        self.child_relationships[source_idx].append((target_idx, rel_type))
                except (ValueError, IndexError):
                    continue
        
        # Load multiple parent cases
        with open('data/split_etymdb/etymdb_links_index.csv') as f:
            for line in f:
                try:
                    parts = line.strip().split('\t')
                    if len(parts) < 2:  # Need at least neg_idx and one parent
                        continue
                    neg_idx = int(parts[0])
                    parents = [int(p) for p in parts[1:]]
                    if all(p in self.word_data for p in parents):  # Only add if all parents exist
                        self.multi_parents[neg_idx] = parents
                except (ValueError, IndexError):
                    continue

    def is_valid_english_word(self, word: str) -> bool:
        """Check if a word is a valid English word using system word list and frequency."""
        word_lower = word.lower()
        # Must be in system word list, have reasonable frequency, and not be capitalized
        return (word_lower in self.valid_words and 
                self.word_frequencies.get(word_lower, 0) >= 0.0001 and
                word == word_lower)  # Reject capitalized words

    def build_tree(self, start_idx: int, visited: Optional[Set[int]] = None, seen_english: Optional[Set[str]] = None) -> Optional[Tree]:
        """Build a tree starting from any word index, including more relationship types."""
        if visited is None:
            visited = set()
        if seen_english is None:
            seen_english = set()
        
        if start_idx in visited:
            return None  # Prevent cycles
        
        if start_idx not in self.word_data:
            return None
        
        visited.add(start_idx)
        
        # Get word data
        lang, word, gloss = self.word_data[start_idx]
        
        # Prune duplicate English leaves globally per tree and filter invalid words
        if lang == 'en':
            word_lower = word.lower()
            if word_lower in seen_english:  # Case-insensitive duplicate check
                return None
            # Skip words not in system word list, with low frequency, or capitalized
            if not self.is_valid_english_word(word):
                return None
            seen_english.add(word_lower)  # Store lowercase version
        
        # Build children
        children = []
        for child_idx, rel_type in self.child_relationships[start_idx]:
            # Include more relationship types
            if rel_type in ['inh', 'der', 'der(s)', 'der(p)', 'bor', 'cmpd+bor']:  # Include compounds but not cognates
                # For all relationships, only follow the correct direction
                source_idx, target_idx = self.get_relationship_direction(rel_type, child_idx, start_idx)
                if target_idx == child_idx:  # Only follow if we're going in the right direction
                    child_tree = self.build_tree(child_idx, set(visited), seen_english)
                    if child_tree:
                        children.append(child_tree)
        
        # If this is not an English word and has no children that lead to English words, prune it
        if lang != 'en' and not children:
            return None
        
        # Create the tree
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
        if total_nodes < 3:
            return 0.0, False
        if is_linear:
            return 0.0, False
        if branch_points < 2:  # Require at least 2 branch points
            return 0.0, False
        if english_count < 2:
            return 0.0, False
        
        # Scoring factors:
        score += len(languages) * 2
        if english_count < total_nodes * 0.8:
            score += english_count
        if 3 <= total_nodes <= 15:
            score += total_nodes
        else:
            score -= abs(total_nodes - 8)
        score += branch_points * 2.0  # Increased weight for branch points
        score += max_branches * 1.5
        
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

    def build_unfiltered_tree(self, start_idx: int, visited: Optional[Set[int]] = None) -> Optional[Tree]:
        """Build a tree without any filtering or pruning."""
        if visited is None:
            visited = set()
        
        if start_idx in visited:
            return None  # Prevent cycles
        
        if start_idx not in self.word_data:
            return None
        
        visited.add(start_idx)
        
        # Get word data
        lang, word, gloss = self.word_data[start_idx]
        
        # Build children without filtering
        children = []
        for child_idx, rel_type in self.child_relationships[start_idx]:
            child_tree = self.build_unfiltered_tree(child_idx, set(visited))
            if child_tree:
                children.append(child_tree)
        
        # Create the tree
        return {
            'word': word,
            'anglicized': anglicize_word(word) if lang != 'en' else word,
            'lang': lang,
            'gloss': gloss,
            'children': children
        }

    def find_all_trees(self) -> List[Tuple[str, Tree, Optional[Tree], Optional[float]]]:
        """Find all trees, both filtered and unfiltered, starting only from ultimate roots."""
        all_trees = []
        total_trees = 0
        rejected_trees = 0
        rejection_reasons = defaultdict(int)
        
        # Find all indices that are children in any relationship
        all_children = set(self.relationships.keys())
        # Ultimate roots are those not present as children
        ultimate_roots = [idx for idx in self.word_data if idx not in all_children]

        for idx in ultimate_roots:
            lang, word, _ = self.word_data[idx]
            unfiltered_tree = self.build_unfiltered_tree(idx)
            if unfiltered_tree:
                total_trees += 1
                filtered_tree = self.build_tree(idx)
                if filtered_tree:
                    score, is_valid = self.score_tree(filtered_tree)
                    if is_valid:
                        all_trees.append((word, unfiltered_tree, filtered_tree, score))
                    else:
                        # Include unfiltered tree even if filtered version is invalid
                        all_trees.append((word, unfiltered_tree, None, None))
                        rejected_trees += 1
                        rejection_reasons['invalid'] += 1
                else:
                    # Include unfiltered tree even if no filtered version exists
                    all_trees.append((word, unfiltered_tree, None, None))
                    rejected_trees += 1
                    rejection_reasons['filtered_out'] += 1
        
        # Sort by score (None scores will be at the end)
        all_trees.sort(key=lambda x: (x[3] is None, x[3] if x[3] is not None else 0), reverse=True)
        
        print(f"\nTree Statistics:")
        print(f"Total trees built: {total_trees}")
        print(f"Rejected filtered trees: {rejected_trees}")
        print(f"Total trees included: {len(all_trees)}")
        print("\nRejection reasons:")
        for reason, count in rejection_reasons.items():
            print(f"  {reason}: {count}")
        
        return all_trees

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

def output_explorer_data(trees: List[Tuple[str, Tree, Tree, float]], word_frequencies: Dict[str, float]) -> Dict:
    """Convert trees to explorer data format with both filtered and unfiltered versions."""
    explorer_data = {
        "words": {},
        "word_list": []
    }
    
    # Track used clue words to handle duplicates
    used_clue_words = {}
    
    for word, unfiltered_tree, filtered_tree, score in trees:
        # Use filtered tree if available, otherwise use unfiltered tree
        tree_for_words = filtered_tree if filtered_tree else unfiltered_tree
        english_words = collect_english_words(tree_for_words)
            
        # Get the most common English word
        clue_word = get_most_common_english_word(tree_for_words, word_frequencies)
        
        # Handle duplicate clue words by adding a counter
        if clue_word in used_clue_words:
            used_clue_words[clue_word] += 1
            clue_word = f"{clue_word}_{used_clue_words[clue_word]}"
        else:
            used_clue_words[clue_word] = 0
        
        # Add to explorer data using the English word as the key
        explorer_data["words"][clue_word] = {
            "unfiltered_tree": unfiltered_tree,
            "filtered_tree": filtered_tree,  # This will be None for trees without a filtered version
            "related_words": sorted(list(english_words)),  # Sort for consistency
            "score": score,  # This will be None for trees without a filtered version
            "original_word": word  # Store the original word for reference
        }
        explorer_data["word_list"].append(clue_word)
    
    # Sort word list for consistency
    explorer_data["word_list"].sort()
    
    return explorer_data

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Build etymology trees for the game.')
    parser.add_argument('--random', action='store_true', help='Print a random clue word for testing')
    parser.add_argument('--explorer', action='store_true', help='Generate explorer data with unfiltered trees')
    args = parser.parse_args()

    # Clear old data files
    print("Clearing old data files...")
    for file in ['game_data.js', 'explorer_data.js', 'word_frequencies.txt']:
        try:
            os.remove(file)
            print(f"Removed {file}")
        except FileNotFoundError:
            pass

    db = EtymologyDB()
    print("Loading data...")
    db.load_data()
    
    if args.explorer:
        print("Finding all trees (filtered and unfiltered)...")
        trees = db.find_all_trees()
        
        # Generate explorer data
        print("\nGenerating explorer data...")
        explorer_data = output_explorer_data(trees, db.word_frequencies)
        
        # Save to file
        print("Saving to explorer_data.js...")
        with open('explorer_data.js', 'w') as f:
            f.write('const EXPLORER_DATA = ')
            json.dump(explorer_data, f, indent=2)
            f.write(';')
    else:
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
        data = explorer_data if args.explorer else game_data
        random_word = random.choice(list(data["words"].keys()))
        print(f"\nRandom clue word for testing: {random_word}")
        if args.explorer:
            print("\nUnfiltered tree structure:")
            print_tree(data["words"][random_word]["unfiltered_tree"])
            print("\nFiltered tree structure:")
            print_tree(data["words"][random_word]["filtered_tree"])
        else:
            print("\nTree structure:")
            print_tree(data["words"][random_word]["tree"])
        print("\nRelated words:", data["words"][random_word]["related_words"])
    
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