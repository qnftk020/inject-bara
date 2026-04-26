import os
import json
import re
import math
from collections import Counter

# --- Configuration & Constants ---
CONFIG = {
    "paths": {
        "pos_corpus": "data/injections.txt",
        "neg_corpus": "data/normal.txt",
        "output": "data/signatures.json"
    },
    "params": {
        "window_size": 5,
        "min_count_en": 5,
        "min_count_ko": 2,
        "top_n": 200
    },
    "weights": {
        "command_boost_single": 1.5,
        "command_boost_double": 2.0
    }
}

TOPIC_STOPWORDS = {
    'lock', 'pick', 'explosive', 'device', 'car', 'hijack', 'stock', 'market', 
    'financial', 'candidate', 'political', 'bomb', 'murder', 'violence', 
    'weapons', 'drugs', 'illegal', 'theft', 'fraud', 'insider', 'trading',
    'bank', 'money', 'credit', 'card', 'identity', 'personal', 'stolen',
    'scam', 'phishing', 'virus', 'malware', 'hack', 'vulnerability', 'exploit',
    'app', 'mobile', 'household', 'items', 'blog', 'post', 'video', 'music',
    'medical', 'records', 'patients', 'tax', 'welfare', 'insurance', 'government',
    'harm', 'self', 'news', 'getting', 'caught'
}

COMMAND_KEYWORDS = {
    'ignore', 'previous', 'disregard', 'instructions', 'forget', 'override',
    'system', 'prompt', 'command', 'respond', 'output', 'translate', 'repeat',
    '무시', '지시', '명령', '하세요', '이전', '잊어', '작성', '요약'
}

# --- Utility Functions ---

def tokenize(text):
    """Tokenizes text and filters out topic-specific noise."""
    tokens = re.findall(r'[a-zA-Z가-힣]{2,}', text.lower())
    return [t for t in tokens if t not in TOPIC_STOPWORDS]

def count_grams(file_path, window):
    """Counts unigrams and bigrams within a sliding window."""
    unigrams = Counter()
    bigrams = Counter()
    total_tokens = 0
    
    if not os.path.exists(file_path):
        print(f"Warning: {file_path} not found.")
        return unigrams, bigrams, 0

    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            tokens = tokenize(line)
            total_tokens += len(tokens)
            unigrams.update(tokens)
            
            for i in range(len(tokens)):
                for j in range(i + 1, min(i + window, len(tokens))):
                    pair = tuple(sorted((tokens[i], tokens[j])))
                    bigrams[pair] += 1
                    
    return unigrams, bigrams, total_tokens

def calculate_score(wordA, wordB, countAB, pos_uni, pos_total, neg_uni, neg_total):
    """Calculates a weighted PMI score for a word pair."""
    # Basic PMI
    p_ab = countAB / pos_total
    p_a = pos_uni[wordA] / pos_total
    p_b = pos_uni[wordB] / pos_total
    pmi = math.log2(p_ab / (p_a * p_b))
    
    # Rarity Penalty based on Normal Corpus
    neg_p_a = (neg_uni[wordA] + 1) / (neg_total + 1)
    neg_p_b = (neg_uni[wordB] + 1) / (neg_total + 1)
    rarity_penalty = math.log10(1.0 / (neg_p_a * neg_p_b))
    
    score = pmi * rarity_penalty

    # Command Boosting
    boost = 1.0
    if wordA in COMMAND_KEYWORDS or wordB in COMMAND_KEYWORDS:
        boost = CONFIG["weights"]["command_boost_single"]
    if wordA in COMMAND_KEYWORDS and wordB in COMMAND_KEYWORDS:
        boost = CONFIG["weights"]["command_boost_double"]
    
    return round(score * boost, 3)

# --- Main Logic ---

def main():
    paths = CONFIG["paths"]
    params = CONFIG["params"]

    print("Counting grams in injection corpus...")
    pos_uni, pos_bi, pos_total = count_grams(paths["pos_corpus"], params["window_size"])
    
    print("Counting grams in normal corpus...")
    neg_uni, neg_bi, neg_total = count_grams(paths["neg_corpus"], params["window_size"])
    
    print("Calculating and filtering signatures...")
    signatures = []
    
    for (wordA, wordB), countAB in pos_bi.items():
        # Frequency Threshold Check
        is_ko = any(re.search('[가-힣]', w) for w in [wordA, wordB])
        min_count = params["min_count_ko"] if is_ko else params["min_count_en"]
        if countAB < min_count:
            continue 
        
        # Noise Filter: Skip if pair appears in normal corpus
        # Note: We use a stricter check (0 tolerance) to ensure clean signatures
        if (wordA, wordB) in neg_uni: # This is a simple unigram check for speed, 
                                     # bigram check is better but more expensive
            continue

        score = calculate_score(wordA, wordB, countAB, pos_uni, pos_total, neg_uni, neg_total)
        signatures.append({"wordA": wordA, "wordB": wordB, "score": score})
    
    # Sort and Export
    signatures.sort(key=lambda x: x['score'], reverse=True)
    top_signatures = signatures[:params["top_n"]]
    
    print(f"Exporting {len(top_signatures)} signatures to {paths['output']}")
    with open(paths['output'], 'w', encoding='utf-8') as f:
        json.dump(top_signatures, f, ensure_ascii=False, indent=2)

    print("\nTop 20 refined signatures:")
    for sig in top_signatures[:20]:
        print(f"{sig['wordA']} + {sig['wordB']}: {sig['score']}")

if __name__ == "__main__":
    main()
