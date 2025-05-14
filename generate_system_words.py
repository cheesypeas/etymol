#!/usr/bin/env python3

def generate_system_words():
    """Generate system_words.js from the British English word list."""
    words = set()
    
    # Read words from the British English word list
    with open('/usr/share/dict/british-english', 'r') as f:
        for line in f:
            word = line.strip().lower()
            # Only include words that are likely valid English words
            if word and word.isalpha() and len(word) >= 2:
                words.add(word)
    
    # Write to system_words.js
    with open('system_words.js', 'w') as f:
        f.write('const SYSTEM_WORDS = new Set([\n')
        # Write words in chunks of 10 for better readability
        words_list = sorted(list(words))
        for i in range(0, len(words_list), 10):
            chunk = words_list[i:i+10]
            f.write('    ' + ', '.join(f'"{word}"' for word in chunk) + ',\n')
        f.write(']);\n')
    
    print(f"Generated system_words.js with {len(words)} words")

if __name__ == '__main__':
    generate_system_words() 