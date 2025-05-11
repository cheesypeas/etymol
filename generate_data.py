import json
import argparse
from datetime import datetime

# -------------------- PARAMETERS --------------------
def parse_args():
    parser = argparse.ArgumentParser(description='Generate game data for the etymology game.')
    parser.add_argument('--all', action='store_true', help='Run all steps')
    return parser.parse_args()

# -------------------- GAME DATA GENERATION --------------------
def generate_game_data():
    # TEMPORARY: Hardcoded sample data for testing
    # TODO: Replace with actual data generation logic
    game_data = {
        'words': {
            'spinal': {
                'tree': {
                    'word': 'spinus',
                    'lang': 'la',
                    'gloss': 'thorn bush',
                    'children': [
                        {
                            'word': 'spīna',
                            'lang': 'la',
                            'gloss': 'spine',
                            'children': [
                                {
                                    'word': 'spinal',
                                    'lang': 'en',
                                    'gloss': 'spinal',
                                    'children': [
                                        {
                                            'word': 'propriospinal',
                                            'lang': 'en',
                                            'gloss': 'propriospinal',
                                            'children': []
                                        }
                                    ]
                                },
                                {
                                    'word': 'spine',
                                    'lang': 'en',
                                    'gloss': 'spine',
                                    'children': [
                                        {
                                            'word': 'c-spine',
                                            'lang': 'en',
                                            'gloss': 'C-spine',
                                            'children': []
                                        },
                                        {
                                            'word': 'spinely',
                                            'lang': 'en',
                                            'gloss': 'spinely',
                                            'children': []
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                'related_words': ['albaspine', 'c-spine', 'propriospinal', 'spinal', 'spine', 'spinely'],
                'english_nodes': [2, 3, 4, 5, 6, 7]  # Indices of English words in the tree
            }
        },
        'word_list': ['spinal']  # Ordered list for daily selection
    }
    return game_data

def save_game_data(game_data):
    # Generate the JS file with the game data
    js_content = f"""// Generated on {datetime.now().isoformat()}
// TEMPORARY: Hardcoded sample data for testing
// TODO: Replace with actual data generation logic
const GAME_DATA = {json.dumps(game_data, indent=2)};
"""
    with open('game_data.js', 'w') as f:
        f.write(js_content)

# -------------------- MAIN --------------------
def main():
    args = parse_args()
    if args.all:
        print("Generating game data...")
        game_data = generate_game_data()
        save_game_data(game_data)
        print(f"Generated game data with {len(game_data['word_list'])} words")

if __name__ == '__main__':
    main() 