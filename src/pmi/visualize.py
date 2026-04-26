import json
import os
from wordcloud import WordCloud
import matplotlib.pyplot as plt

def generate_wordcloud(json_path, output_path):
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        signatures = json.load(f)

    # Use scores as weights for the wordcloud
    # We combine wordA and wordB with an underscore or just treat them as individual words
    # Here, we'll use the pairs as single tokens for better visualization
    frequencies = {}
    for sig in signatures:
        pair = f"{sig['wordA']}_{sig['wordB']}"
        frequencies[pair] = sig['score']

    print(f"Generating wordcloud from {len(frequencies)} pairs...")
    
    wc = WordCloud(
        width=800, 
        height=400, 
        background_color='white',
        colormap='inferno',
        max_words=100
    ).generate_from_frequencies(frequencies)

    plt.figure(figsize=(10, 5))
    plt.imshow(wc, interpolation='bilinear')
    plt.axis('off')
    plt.tight_layout(pad=0)
    
    print(f"Saving wordcloud to {output_path}")
    plt.savefig(output_path)
    plt.close()

if __name__ == "__main__":
    generate_wordcloud('data/signatures.json', 'data/wordcloud.png')
