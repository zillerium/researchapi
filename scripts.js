db.wordcounts.findOne(
...   {"wordObj.word": 'certain'},
...   {"wordObj.$": 1, _id: 0}
... );
