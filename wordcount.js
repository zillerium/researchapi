import mongoose from 'mongoose';
import fs from 'fs';

mongoose.connect('mongodb://localhost:27017/refs', { useNewUrlParser: true, useUnifiedTopology: true });

const RefTextSchema = new mongoose.Schema({
  dbKey: String,
  reference: String,
  refNumber: Number,
  refText: String,
  __v: Number
});

const RefText = mongoose.model('References', RefTextSchema);

const WordCountSchema = new mongoose.Schema({
  reference: String,
  wordObj: [{ word: String, frequency: Number }]
});

const WordCount = mongoose.model('WordCounts', WordCountSchema);

const STOP_WORDS = [
  "and", "the", "at", "a", "to", "of", "in", "I", "is", "that", "it", 
  "you", "he", "was", "for", "on", "are", "as", "with", "his", "they", 
];


const countWords1 = (text) => {
  const words = text.toLowerCase().split(/\s+|,|\.|\n/).filter(Boolean);
  const wordCount = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }
  return wordCount;
};

const countWords = (text) => {
  const words = text
    .toLowerCase()
    .split(/\s+|,|\.|\n/)
    .filter(Boolean)
    .filter(word => !STOP_WORDS.includes(word)); // Filter out stop words

  const wordCount = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }
  return wordCount;
};


const processReferences1 = async () => {
  try {
    const controlData = fs.readFileSync('control.txt', 'utf-8');
    const references = controlData.split('\n').filter(Boolean);
    
    for (const reference of references) {
            console.log("reference == ", reference);
      //const refTexts = await RefText.find({ reference: reference });
      const refTexts = await RefText.find();
 console.log("ref text == ", refTexts);      
      const allText = refTexts.map(record => record.refText).join(' ');
 console.log("all text == ", allText);      
      const wordCount = countWords(allText);

      const wordArray = Object.keys(wordCount).map(word => ({ word: word, frequency: wordCount[word] }));
 console.log("word array === ", wordArray);
      await RefText.updateOne(
        { reference: reference + 'Words' },
        { $set: { wordObj: wordArray } },
        { upsert: true }
      );
    }

    console.log('Word counting process completed.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
};

const processReferences = async () => {
  try {
    const controlData = fs.readFileSync('control.txt', 'utf-8');
    const references = controlData.split('\n').filter(Boolean);
    
    for (const reference of references) {
      console.log("reference == ", reference);

      const refTexts = await RefText.find({ reference: reference });

      console.log("ref text == ", refTexts);      
      const allText = refTexts.map(record => record.refText).join(' ');

      console.log("all text == ", allText);      
      const wordCount = countWords(allText);

      const wordArray = Object.keys(wordCount).map(word => ({ word: word, frequency: wordCount[word] }));
      console.log("word array === ", wordArray);

      await WordCount.findOneAndUpdate(
        { reference: reference + 'Words' },
        { $set: { wordObj: wordArray } },
        { upsert: true, new: true }
      );
    }

    console.log('Word counting process completed.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
};


processReferences();
 
