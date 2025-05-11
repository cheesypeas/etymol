import csv
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional

# Type aliases for clarity
WordData = Tuple[str, str, str]  # (lang, word, gloss)
Relationships = Dict[int, List[Tuple[int, str]]]  # child_idx -> [(parent_idx, rel_type), ...]
MultiParents = Dict[int, List[int]]  # neg_idx -> [parent1, parent2, ...]
Tree = Dict[str, any]  # Our tree structure

class EtymologyDB:
    def __init__(self):
        self.word_data: Dict[int, WordData] = {}
        self.relationships: Relationships = defaultdict(list)
        self.multi_parents: MultiParents = {}
        self.child_relationships: Relationships = defaultdict(list)  # parent_idx -> [(child_idx, rel_type), ...]
        
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
            'lang': lang,
            'gloss': gloss,
            'children': children
        }

    def score_tree(self, tree: Tree) -> float:
        """Score a tree based on various factors."""
        if not tree:
            return 0.0
        
        score = 0.0
        languages = set()
        english_count = 0
        total_nodes = 0
        
        def traverse(t: Tree):
            nonlocal score, languages, english_count, total_nodes
            if not t:
                return
            
            total_nodes += 1
            languages.add(t['lang'])
            if t['lang'] == 'en':
                english_count += 1
            
            for child in t['children']:
                traverse(child)
        
        traverse(tree)
        
        # Scoring factors:
        # 1. Number of languages (more variety is better)
        score += len(languages) * 2
        
        # 2. Presence of English words (but not too many)
        if 0 < english_count < total_nodes * 0.7:  # At least one English word, but not too many
            score += english_count
        
        # 3. Tree size (not too small, not too large)
        if 3 <= total_nodes <= 10:
            score += total_nodes
        else:
            score -= abs(total_nodes - 6)  # Penalize trees that are too small or too large
        
        return score

    def find_interesting_trees(self, min_score: float = 5.0) -> List[Tuple[str, Tree, float]]:
        """Find interesting trees by building from each word and scoring them."""
        interesting_trees = []
        
        for idx, (lang, word, _) in self.word_data.items():
            tree = self.build_tree(idx)
            if tree:
                score = self.score_tree(tree)
                if score >= min_score:
                    interesting_trees.append((word, tree, score))
        
        # Sort by score
        interesting_trees.sort(key=lambda x: x[2], reverse=True)
        return interesting_trees

def main():
    db = EtymologyDB()
    print("Loading data...")
    db.load_data()
    print("Finding interesting trees...")
    trees = db.find_interesting_trees()
    print(f"Found {len(trees)} interesting trees")
    
    # Print top 5 trees
    for word, tree, score in trees[:5]:
        print(f"\nWord: {word}, Score: {score}")
        print_tree(tree)

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