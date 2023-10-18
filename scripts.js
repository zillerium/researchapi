db.wordcounts.findOne(
...   {"wordObj.word": 'certain'},
...   {"wordObj.$": 1, _id: 0}
... );

db.wordcounts.find(
  { reference: "HumbelDeGov" + 'Words' },
  { wordObj: { $slice: 5 } }
);
