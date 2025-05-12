import unittest
from build_trees import EtymologyDB, Tree, WordData, anglicize_word, collect_english_words, get_most_common_english_word

class TestEtymologyDB(unittest.TestCase):
    def setUp(self):
        """Set up test data before each test."""
        self.db = EtymologyDB()
        # Add some test word data
        self.db.word_data = {
            1: ('en', 'book', 'a written work'),
            2: ('la', 'liber', 'book'),
            3: ('en', 'library', 'a collection of books'),
            4: ('en', 'libretto', 'text of an opera'),
            5: ('it', 'libretto', 'little book'),
            6: ('en', 'bookstore', 'a store that sells books'),
            7: ('en', 'bookmark', 'a marker for a book'),
            8: ('en', 'bookworm', 'a person who reads a lot'),
            9: ('en', 'bookish', 'fond of reading'),
            10: ('en', 'booking', 'reservation'),
        }
        # Add some test relationships
        self.db.relationships = {
            1: [(2, 'der')],  # book derived from liber
            3: [(2, 'der')],  # library derived from liber
            4: [(5, 'bor')],  # libretto borrowed from Italian
            6: [(1, 'cmpd+bor')],  # bookstore compound with book
            7: [(1, 'cmpd+bor')],  # bookmark compound with book
            8: [(1, 'cmpd+bor')],  # bookworm compound with book
            9: [(1, 'der')],  # bookish derived from book
            10: [(1, 'der')],  # booking derived from book
        }
        # Add child relationships (reverse of relationships)
        self.db.child_relationships = {
            2: [(1, 'der'), (3, 'der')],  # liber has two children
            5: [(4, 'bor')],  # libretto has one child
            1: [(6, 'cmpd+bor'), (7, 'cmpd+bor'), (8, 'cmpd+bor'), (9, 'der'), (10, 'der')],  # book has many children
            3: [],  # library has no children
            9: [],  # bookish has no children
            10: [],  # booking has no children
            6: [],  # bookstore has no children
            7: [],  # bookmark has no children
            8: [],  # bookworm has no children
        }
        # Add some test word frequencies
        self.db.word_frequencies = {
            'book': 0.1,
            'library': 0.05,
            'libretto': 0.001,
            'bookstore': 0.02,
            'bookmark': 0.015,
            'bookworm': 0.008,
            'bookish': 0.003,
            'booking': 0.04,
        }
        # Add some test valid words
        self.db.valid_words = {
            'book', 'library', 'bookstore', 'bookmark', 
            'bookworm', 'bookish', 'booking'
        }  # Note: libretto is intentionally excluded

    def test_anglicize_word(self):
        """Test the anglicize_word function."""
        self.assertEqual(anglicize_word('café'), 'cafe')
        self.assertEqual(anglicize_word('naïve'), 'naive')
        self.assertEqual(anglicize_word('résumé'), 'resume')
        self.assertEqual(anglicize_word('book'), 'book')  # No change for English words

    def test_get_relationship_direction(self):
        """Test the get_relationship_direction method."""
        # Test inheritance relationship
        source, target = self.db.get_relationship_direction('inh', 1, 2)
        self.assertEqual(source, 2)  # Parent should be source
        self.assertEqual(target, 1)  # Child should be target

        # Test derivation relationship
        source, target = self.db.get_relationship_direction('der', 1, 2)
        self.assertEqual(source, 2)  # Parent should be source
        self.assertEqual(target, 1)  # Child should be target

        # Test cognate relationship (bidirectional)
        source, target = self.db.get_relationship_direction('cog', 1, 2)
        self.assertEqual(source, 1)  # First index should be source
        self.assertEqual(target, 2)  # Second index should be target

    def test_validate_word_data(self):
        """Test the validate_word_data method."""
        # Valid data
        self.assertTrue(self.db.validate_word_data(1, 'en', 'book', 'a written work'))
        
        # Invalid data
        self.assertFalse(self.db.validate_word_data(-1, 'en', 'book', 'a written work'))  # Negative index
        self.assertFalse(self.db.validate_word_data(1, '', 'book', 'a written work'))  # Empty language
        self.assertFalse(self.db.validate_word_data(1, 'en', '', 'a written work'))  # Empty word

    def test_validate_relationship(self):
        """Test the validate_relationship method."""
        # Valid relationships
        self.assertTrue(self.db.validate_relationship('inh', 1, 2))
        self.assertTrue(self.db.validate_relationship('der', 1, 2))
        self.assertTrue(self.db.validate_relationship('cog', 1, 2))
        
        # Invalid relationships
        self.assertFalse(self.db.validate_relationship('invalid', 1, 2))  # Invalid type
        self.assertFalse(self.db.validate_relationship('inh', '1', 2))  # Non-integer index

    def test_is_valid_english_word(self):
        """Test the is_valid_english_word method."""
        # Valid words
        self.assertTrue(self.db.is_valid_english_word('book'))
        self.assertTrue(self.db.is_valid_english_word('library'))
        
        # Invalid words
        self.assertFalse(self.db.is_valid_english_word('Book'))  # Capitalized
        self.assertFalse(self.db.is_valid_english_word('invalidword'))  # Not in valid words
        self.assertFalse(self.db.is_valid_english_word('libretto'))  # Not in valid words list

    def test_build_tree(self):
        """Test the build_tree method."""
        # Build tree starting from 'liber'
        tree = self.db.build_tree(2)
        
        # Verify tree structure
        self.assertIsNotNone(tree)
        self.assertEqual(tree['word'], 'liber')
        self.assertEqual(tree['lang'], 'la')
        
        # Should have two children (book and library)
        self.assertEqual(len(tree['children']), 2)
        
        # Verify children
        child_words = {child['word'] for child in tree['children']}
        self.assertIn('book', child_words)
        self.assertIn('library', child_words)

    def test_collect_english_words(self):
        """Test the collect_english_words function."""
        tree = self.db.build_tree(2)  # Start from 'liber'
        english_words = collect_english_words(tree)
        
        # Should collect all English words in the tree
        expected_words = {'book', 'library', 'bookstore', 'bookmark', 'bookworm', 'bookish', 'booking'}
        self.assertEqual(english_words, expected_words)

    def test_get_most_common_english_word(self):
        """Test the get_most_common_english_word function."""
        tree = self.db.build_tree(2)  # Start from 'liber'
        most_common = get_most_common_english_word(tree, self.db.word_frequencies)
        
        # 'book' should be most common based on our test frequencies
        self.assertEqual(most_common, 'book')

    def test_score_tree(self):
        """Test the score_tree method."""
        tree = self.db.build_tree(2)  # Start from 'liber'
        score, is_valid = self.db.score_tree(tree)
        
        # Tree should be valid and have a positive score
        self.assertTrue(is_valid)
        self.assertGreater(score, 0)

if __name__ == '__main__':
    unittest.main() 