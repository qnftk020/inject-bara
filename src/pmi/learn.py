import os
import json
import re
import math
from collections import Counter, defaultdict

# Stopwords to filter out 'Topic Noise' (Harmful contents vocabulary)
TOPIC_STOPWORDS = {
    'lock', 'pick', 'explosive', 'device', 'car', 'hijack', 'stock', 'market', 
    'financial', 'candidate', 'political', 'bomb', 'murder', 'violence', 
    'weapons', 'drugs', 'illegal', 'theft', 'fraud', 'insider', 'trading',
    'bank', 'money', 'credit', 'card', 'identity', 'personal', 'stolen',
    'scam', 'phishing', 'virus', 'malware', 'hack', 'vulnerability', 'exploit',
    'app', 'mobile', 'household', 'items', 'blog', 'post', 'video', 'music',
    'medical', 'records', 'patients', 'tax', 'welfare', 'insurance', 'government'
}

COMMAND_KEYWORDS = {
    'ignore', 'previous', 'disregard', 'instructions', 'forget', 'override',
    'system', 'prompt', 'command', 'respond', 'output', 'translate', 'repeat',
    '무시', '지시', '명령', '하세요', '이전', '잊어', '작성', '요약'
}

def tokenize(text):
    # Split by whitespace and punctuation, lowercase, length >= 2
    tokens = re.findall(r'[a-zA-Z가-힣]{2,}', text.lower())
    # Filter out common topic noise to focus on command structures
    tokens = [t for t in tokens if t not in TOPIC_STOPWORDS]
    return tokens

def count_grams(file_path, window=3): # Reduced window size for command-action pairs
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

def main():
    print("Counting grams in injections...")
    pos_uni, pos_bi, pos_total = count_grams('data/injections.txt', window=3)
    
    print("Counting grams in normal text...")
    neg_uni, neg_bi, neg_total = count_grams('data/normal.txt', window=3)
    
    print("Calculating PMI...")
    signatures = []
    
    # We only care about pairs in the positive (injection) corpus
    for (wordA, wordB), countAB in pos_bi.items():
        # Lower threshold for Korean tokens because the corpus is smaller
        is_korean = any(re.search('[가-힣]', w) for w in [wordA, wordB])
        min_count = 2 if is_korean else 5
        
        if countAB < min_count: continue 
        
        p_ab = countAB / pos_total
        p_a = pos_uni[wordA] / pos_total
        p_b = pos_uni[wordB] / pos_total
        
        pmi = math.log2(p_ab / (p_a * p_b))
        
        # Filter: If the pair is common in normal corpus, strongly penalize
        neg_countAB = neg_bi.get((wordA, wordB), 0)
        
        # Strict filter: if it appears in normal corpus more than once, it's likely noise
        if neg_countAB > 1: continue 
        
        # Penalize words that are individually very common in normal corpus
        neg_p_a = (neg_uni[wordA] + 1) / (neg_total + 1)
        neg_p_b = (neg_uni[wordB] + 1) / (neg_total + 1)
        
        # Final Score: PMI biased by rarity in normal corpus
        rarity_penalty = math.log10(1.0 / (neg_p_a * neg_p_b))
        
        score = pmi * rarity_penalty

        # Boost score if words are command-related
        if wordA in COMMAND_KEYWORDS or wordB in COMMAND_KEYWORDS:
            score *= 1.5
        if wordA in COMMAND_KEYWORDS and wordB in COMMAND_KEYWORDS:
            score *= 2.0
        
        signatures.append({
            "wordA": wordA,
            "wordB": wordB,
            "score": round(score, 3)
        })
    
    # Sort by score descending
    signatures.sort(key=lambda x: x['score'], reverse=True)
    
    # Take top 200
    top_signatures = signatures[:200]
    
    print(f"Exporting {len(top_signatures)} signatures to data/signatures.json")
    with open('data/signatures.json', 'w', encoding='utf-8') as f:
        json.dump(top_signatures, f, ensure_ascii=False, indent=2)

    print("\nTop 20 pairs:")
    for sig in top_signatures[:20]:
        print(f"{sig['wordA']} + {sig['wordB']}: {sig['score']}")

if __name__ == "__main__":
    main()
