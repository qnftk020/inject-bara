import os
import json
import re
import math
from collections import Counter, defaultdict

def tokenize(text):
    # Split by whitespace and punctuation, lowercase, length >= 2
    tokens = re.findall(r'[a-zA-Z가-힣]{2,}', text.lower())
    return tokens

def count_grams(file_path, window=5):
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
    pos_uni, pos_bi, pos_total = count_grams('data/injections.txt', window=5)
    
    print("Counting grams in normal text...")
    neg_uni, neg_bi, neg_total = count_grams('data/normal.txt', window=5)
    
    print("Calculating PMI...")
    signatures = []
    
    # We only care about pairs in the positive (injection) corpus
    for (wordA, wordB), countAB in pos_bi.items():
        if countAB < 3: continue  # Minimum occurrence threshold
        
        # P(A, B) = count(A, B) / total_pairs
        # But for PMI, we can use a simpler version: log(countAB) - log(countA) - log(countB) + log(total)
        # We'll use the counts directly for simplicity in comparison
        
        p_ab = countAB / pos_total
        p_a = pos_uni[wordA] / pos_total
        p_b = pos_uni[wordB] / pos_total
        
        pmi = math.log2(p_ab / (p_a * p_b))
        
        # Filter: If the pair is common in normal corpus, reduce score or skip
        # P(A, B) in normal corpus
        neg_countAB = neg_bi.get((wordA, wordB), 0)
        neg_p_ab = (neg_countAB + 0.1) / (neg_total + 1) # Laplace smoothing
        
        # Adjust PMI by negative corpus frequency
        # If it's very common in normal corpus, the score will be low
        # ratio = (countAB / pos_total) / ((neg_countAB + 1) / neg_total)
        
        # Simple filter: if neg_countAB is high relative to its frequency in positive, it's not a good signature
        if neg_countAB > countAB * 2: continue 
        
        # Boost score if it's very rare in normal corpus
        score = pmi * (1.0 / (math.log(neg_countAB + 2)))
        
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
