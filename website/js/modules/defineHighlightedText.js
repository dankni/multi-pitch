import terms from '/data/terms/terms.json' with { type: "json" };

addEventListener("mouseup", (event) => { 
    const selectedText = window.getSelection().toString();
    const words = selectedText.split(" ").map(w => w.toLowerCase());
    const uniqueWords = [...new Set(words)];
    uniqueWords.forEach(word => {
        if (terms[word.toLowerCase()]) {
            console.log(`Definition of ${word}: ${terms[word.toLowerCase()].definition}`);
        }
    });    
});