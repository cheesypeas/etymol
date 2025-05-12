"""
Etymology Explorer Tool
----------------------

This tool loads etymological data from the split_etymdb dataset and allows programmatic exploration of word relationships.

Data format:
- etymdb_values.csv: index, language, _, term, gloss
- etymdb_links_info.csv: relationship_type, source_index, target_index

Purpose:
- To provide a programmatic interface for querying etymological relationships between words, suitable for use by AI agents or scripts.
- Returns structured data for easy downstream processing.

Usage:
    python explore_etymology.py --term <word> [--language <lang>]

Example:
    python explore_etymology.py --term book --language en
"""

import csv
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from collections import defaultdict
import argparse
import json

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

    def explore_word(self, term: str, language: str = "en") -> List[Dict[str, Any]]:
        """Return all relationships for a given word as structured data."""
        words = self.find_words(term, language)
        if not words:
            return []

        results = []
        for word in words:
            rels_by_type = defaultdict(list)
            for rel in self.get_relationships(word):
                rels_by_type[rel.type].append(rel)
            word_info = {
                "term": word.term,
                "language": word.language,
                "index": word.index,
                "gloss": word.gloss,
                "relationships": {}
            }
            for rel_type, rels in rels_by_type.items():
                word_info["relationships"][rel_type] = [
                    {
                        "other_term": (rel.target.term if rel.source.index == word.index else rel.source.term),
                        "other_language": (rel.target.language if rel.source.index == word.index else rel.source.language),
                        "other_index": (rel.target.index if rel.source.index == word.index else rel.source.index),
                        "other_gloss": (rel.target.gloss if rel.source.index == word.index else rel.source.gloss)
                    }
                    for rel in rels
                ]
            results.append(word_info)
        return results

def main():
    parser = argparse.ArgumentParser(description="Explore etymological relationships for a word.")
    parser.add_argument('--term', type=str, required=True, help='Word to explore')
    parser.add_argument('--language', type=str, default='en', help='Language code (default: en)')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    args = parser.parse_args()

    explorer = EtymologyExplorer()
    explorer.load_data()
    results = explorer.explore_word(args.term, args.language)

    if args.json:
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        if not results:
            print(f"No entries found for '{args.term}' in language '{args.language}'")
            return
        for word_info in results:
            print(f"\n{word_info['term']} ({word_info['language']}) [Index: {word_info['index']}] - {word_info['gloss']}")
            for rel_type, rels in word_info['relationships'].items():
                print(f"  {rel_type.upper()} relationships:")
                for rel in rels:
                    print(f"    - {rel['other_term']} ({rel['other_language']}) [Index: {rel['other_index']}] - {rel['other_gloss']}")

if __name__ == "__main__":
    main() 