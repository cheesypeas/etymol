#!/usr/bin/env python3

import csv
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from collections import defaultdict

@dataclass
class Word:
    index: int
    language: str
    term: str
    gloss: str

@dataclass
class Relationship:
    type: str  # 'der', 'inh', 'cog', 'bor'
    source: Word
    target: Word

class EtymologyExplorer:
    def __init__(self, data_dir: str = "data/split_etymdb"):
        self.data_dir = Path(data_dir)
        self.words: Dict[int, Word] = {}
        self.relationships: List[Relationship] = []
        self.term_to_indices: Dict[Tuple[str, str], List[int]] = defaultdict(list)  # (language, term) -> [indices]
        
    def load_data(self):
        """Load all necessary data files."""
        print("Loading word data...")
        with open(self.data_dir / "etymdb_values.csv", 'r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='\t')
            for row in reader:
                if len(row) >= 4:
                    index = int(row[0])
                    word = Word(
                        index=index,
                        language=row[1],
                        term=row[3],
                        gloss=row[4] if len(row) > 4 else ""
                    )
                    self.words[index] = word
                    self.term_to_indices[(row[1], row[3])].append(index)

        print("Loading relationship data...")
        with open(self.data_dir / "etymdb_links_info.csv", 'r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='\t')
            for row in reader:
                if len(row) >= 3:
                    rel_type = row[0]
                    source_idx = int(row[1])
                    target_idx = int(row[2])
                    
                    # Only add relationships if both words exist
                    if source_idx in self.words and target_idx in self.words:
                        self.relationships.append(Relationship(
                            type=rel_type,
                            source=self.words[source_idx],
                            target=self.words[target_idx]
                        ))

    def find_words(self, term: str, language: str = "en") -> List[Word]:
        """Find all words matching the term and language."""
        key = (language, term)
        return [self.words[idx] for idx in self.term_to_indices[key]]

    def get_relationships(self, word: Word) -> List[Relationship]:
        """Get all relationships for a given word."""
        return [
            rel for rel in self.relationships
            if rel.source.index == word.index or rel.target.index == word.index
        ]

    def explore_word(self, term: str, language: str = "en"):
        """Explore relationships for a given word."""
        words = self.find_words(term, language)
        if not words:
            print(f"Word '{term}' not found in language '{language}'")
            return

        if len(words) > 1:
            print(f"\nFound {len(words)} entries for '{term}' in {language}:")
            for i, word in enumerate(words, 1):
                print(f"\n{i}. {word.term} ({word.language})")
                print(f"   Index: {word.index}")
                if word.gloss:
                    print(f"   Gloss: {word.gloss}")
            
            while True:
                try:
                    choice = int(input("\nEnter the number of the entry to explore (or 0 to quit): "))
                    if choice == 0:
                        return
                    if 1 <= choice <= len(words):
                        word = words[choice - 1]
                        break
                    print("Invalid choice. Please try again.")
                except ValueError:
                    print("Please enter a number.")
        else:
            word = words[0]

        print(f"\nExploring relationships for: {word.term} ({word.language})")
        print(f"Index: {word.index}")
        if word.gloss:
            print(f"Gloss: {word.gloss}")

        # Group relationships by type
        rels_by_type = defaultdict(list)
        for rel in self.get_relationships(word):
            rels_by_type[rel.type].append(rel)

        # Print relationships
        for rel_type, rels in rels_by_type.items():
            print(f"\n{rel_type.upper()} relationships:")
            for rel in rels:
                if rel.source.index == word.index:
                    other = rel.target
                else:
                    other = rel.source
                print(f"  - {other.term} ({other.language})" + 
                      (f" - {other.gloss}" if other.gloss else ""))

def main():
    explorer = EtymologyExplorer()
    explorer.load_data()
    
    while True:
        term = input("\nEnter a word to explore (or 'q' to quit): ").strip()
        if term.lower() == 'q':
            break
            
        language = input("Enter language code (default: en): ").strip() or "en"
        explorer.explore_word(term, language)

if __name__ == "__main__":
    main() 