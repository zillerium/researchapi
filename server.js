import { createRequire } from "module";
const require = createRequire(import.meta.url);
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/refs');

const keyReferenceSchema = new mongoose.Schema({
  dbKey: { type: String, unique: true, required: true },
  reference: { type: String, default: null },
  citation: { type: String, default: null },
  link: { type: String, default: null },
  alink: { type: String, default: null },
});

const wordCountSchema = new mongoose.Schema({
  reference: { type: String, required: true },
  wordObj: [
    {
      word: { type: String, required: true },
      frequency: { type: Number, required: true },
    }
  ]
});

// Model for word count data
const WordCountDBRec = mongoose.model('WordCount', wordCountSchema, 'wordcounts');

const sentenceSchema = new mongoose.Schema({
  reference: { type: String, required: true },
  header: { type: String, required: true },
  headerSeq: { type: Number, required: true },
  sentences: [{ sentence: { type: String, required: true } }]
});

const Sentence = mongoose.model('Sentence', sentenceSchema);


// Model for key data
const KeyRefDBRec = mongoose.model('KeyReference', keyReferenceSchema, 'references'); // references is the collection name


const referenceSchema = new mongoose.Schema({
  dbKey: { type: String, default: null },
  reference: { type: String, default: null },
  refNumber: { type: Number, default: null },
  refText: { type: String, default: null },
});

const refDBRec = mongoose.model('Reference', referenceSchema);
 
const fs = require("fs");
const http = require("http");
const https = require("https");
var request = require("request"); 
const cryptojs = require('crypto-js');

const express = require("express");
 
const app = express();
const cors = require('cors');
app.options('*', cors());

const asyncHandler = require("express-async-handler");
const result = require("dotenv").config();

request = require("request");
const bodyParser = require("body-parser");
var wget = require("node-wget");

const privateKey = fs.readFileSync("privkey.pem", "utf8");
const certificate = fs.readFileSync("fullchain.pem", "utf8");
const credentials = {
  key: privateKey,
  cert: certificate,
};

app.use("/", express.static(path.join(__dirname, "/html")));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//app.post("/getDBData", function (req, res) {
const updateRec = async (partRec, dbKey) => {

        var rtn = 0;
        rtn =              await refDBRec.updateOne(
                          {'dbKey': dbKey},
                          {$set: partRec},
                          )
                 
return rtn;
}
const insertRec = async (partRec) => {
        var rtn = 0;
                rtn = await partRec.save( async (err, doc) => {
                            return(err ? rtn=1 : rtn=0);
                          })

 return rtn;
}

app.get("/getWordCounts", cors(),
  asyncHandler(async (req, res, next) => {
    const referenceParam = req.query.reference;

    if (!referenceParam) {
      return res.status(400).json({ error: 'Reference parameter is required.' });
    }

    try {
      const record = await WordCountDBRec.findOne({ reference: referenceParam });

      if (!record) {
        return res.status(404).json({ error: 'No records found for the given reference.' });
      }

      // Sort wordObj array by frequency
      const sortedWordObj = record.wordObj.sort((a, b) => b.frequency - a.frequency);

      res.json(sortedWordObj);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while fetching the word counts.' });
    }
  })
);


const addRefDB = async (
   dbKey,
   reference,
   citation,
   link,
   alink,
   refNumber,
   refText
) => {
   console.log("hello");

   // Split refText based on the delimiter |||||| to process multiple references
   const refTexts = refText.split('||||||');
   let rtn = 0;
   refNumber = parseInt(refNumber, 10);

   refNumber++;

   for (const text of refTexts) {
       let jsonDB = {
           dbKey: `${dbKey}-${refNumber}`,  // Modify dbKey with refNumber so that each reference has a unique dbKey
           reference: reference,
           citation: citation,
           link: link,
           alink: alink,
	   refNumber: refNumber,
           refText: text.trim()   // Use the individual text from refTexts array
       };
       
       let refRec = new refDBRec(jsonDB);
       console.log(refRec);

       var found = false; 
       found = await refDBRec.findOne({'dbKey': jsonDB.dbKey});
       
       if (found) {
           rtn = await updateRec(jsonDB, jsonDB.dbKey);
       } else {
           rtn = await insertRec(refRec);
       }

       // Increment refNumber for next iteration
       refNumber++;
   }

   return rtn;
}

const insertKeyData = async (dbKey, reference, citation, link, alink) => {
    // Check for duplicate
    const existingKeyData = await KeyRefDBRec.findOne({ dbKey: dbKey });
    if (existingKeyData) {
        console.log(`Key already exists: ${dbKey}. Skipping insertion.`);
        return; // Skip insertion if the key already exists
    }

    // Create a new key record and save it
    const keyRecord = new KeyRefDBRec({
        dbKey: dbKey,
        reference: reference,
        citation: citation,
        link: link,
        alink: alink
    });
    
    await keyRecord.save();
}

app.get("/getAllReferences", cors(),
  asyncHandler(async (req, res, next) => {
    const references = await getUniqueReferences();
    res.json(references);
  })
);

app.get("/getAllWordReferences", cors(),
  asyncHandler(async (req, res, next) => {
    const references = await getUniqueWordReferences();
	  console.log("references--", references);
    res.json(references);
  })
);
const getUniqueReferences = async () => {
  const uniqueReferences = await KeyRefDBRec.distinct('reference');

  let result = [];
  for (const reference of uniqueReferences) {
    // Skip records with reference ending in "Key"
    if (reference.endsWith('Key')) continue;

    const sampleRecord = await KeyRefDBRec.findOne({ reference: reference });
    result.push({
      reference: sampleRecord.reference,
      citation: sampleRecord.citation,
      link: sampleRecord.link,
      alink: sampleRecord.alink
    });
  }

  return result.sort((a, b) => a.reference.localeCompare(b.reference));
}

app.get("/getSentences", cors(), asyncHandler(async (req, res, next) => {
  const referenceParam = req.query.reference;

  if (!referenceParam) {
    return res.status(400).json({ error: 'Reference parameter is required.' });
  }

  try {
    const allSentences = await Sentence.find({ reference: referenceParam }).sort({headerSeq: 1 });
    if (!allSentences.length) {
      return res.status(404).json({ error: 'No sentences found for the given reference.' });
    }
    res.json(allSentences);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the sentences.' });
  }
}));


app.get("/getSentences1", cors(), asyncHandler(async (req, res, next) => {
    const referenceParam = req.query.reference;

const allSentences = [
    {
        header: "Financial Risks",
        sentences: [
            { sentence: "In DeFi, TradFi financial intermediaries are substituted with blockchain technology [1]" }
            //... (additional sentences here if needed)
        ]
    }
    //... (additional sections here if needed)
];

    if (!referenceParam) {
        return res.status(400).json({ error: 'Reference parameter is required.' });
    }

    try {
        res.json(allSentences);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching the sentences.' });
    }
}));

app.get("/getDictionary", cors(), asyncHandler(async (req, res, next) => {

    const referenceParam = req.query.reference;
    if (!referenceParam) {
        return res.status(400).json({ error: 'Reference parameter is required.' });
    }

    try {
        // Fetch key reference from MongoDB
        const keyReference = await KeyRefDBRec.findOne({ reference: referenceParam + "Key" });

        // Fetch list of references associated with the given reference parameter
        const referenceList = await refDBRec.find({ reference: referenceParam }).sort({ refNumber: 1 });

        // Build the refs array from the fetched data
        const refsArray = referenceList.map(record => {
            return {
                ref: `[${record.refNumber}]`,
                text: record.refText
            };
        });

        // Construct the dictionary object
        const dictionary = {
            reference: keyReference.citation,
            link: keyReference.link,
            alink: keyReference.alink,
            refs: refsArray
        };

        // Return the constructed dictionary
        res.json(dictionary);

    } catch (error) {
        return res.status(500).json({ error: 'Error fetching data.' });
    }

}));



app.get("/getDictionary1", cors(), asyncHandler(async (req, res, next) => {
    const referenceParam = req.query.reference;

const dictionary = {
    reference: 'Humbel, Claude. Decentralized Finance: A new frontier of global financial markets regulation. GesKR: Schweizerische Zeitschrift für Gesellschafts-und Kapitalmarktrecht sowie Umstrukturierungen 1 (2022): 9-25.',
    link: 'https://ipfs.io/ipfs/QmaziaN5rA5mA26fjQK3Mr2cTgXH6BKjsskpuy5iDQvNYa',
    alink: 'https://www.zora.uzh.ch/id/eprint/218603/1/Humbel_GesKR_1_2022.pdf',
    refs: [
        {
            ref: '[1]',
            text: 'Whereas DeFi is still in its infancy, a central tenet is its determination to solve the problems of traditional finance by substituting traditional financial intermediaries with blockchain technology.'
        }
        //... (additional references here if needed)
    ]
};


    if (!referenceParam) {
        return res.status(400).json({ error: 'Reference parameter is required.' });
    }

    try {
        res.json(dictionary);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching the dictionary.' });
    }
}));




const getUniqueWordReferences = async () => {
    // Assuming we have a Mongoose model for wordcounts
    const WordCounts = mongoose.model('WordCount');

    const uniqueReferences = await WordCounts.distinct('reference');

    // As the references from wordcounts do not have associated citation, link, or alink,
    // we can directly return the sorted unique references.
    return uniqueReferences.sort((a, b) => a.localeCompare(b));
}

// ... [Your existing code]

app.get("/getRefData", cors(),
  asyncHandler(async (req, res, next) => {
    const keyreferenceParam = req.query.reference + "Key";
    const referenceParam = req.query.reference;

    if ((!referenceParam) || (!keyreferenceParam)) {
      console.log(" params are invalid ");
      return res.status(400).json({ error: 'Reference parameter is required.' });
    }

    try {
      const records = await KeyRefDBRec.find({ reference: keyreferenceParam });

      if (records.length === 0) {
        return res.status(404).json({ error: 'No records found for the given key reference.' });
      } else {
        console.log("data record data found ");
      }

      // Fetching and sorting data records by refNumber
      const datarecords = await refDBRec.find({ reference: referenceParam }).sort({ refNumber: 1 });
      
      if (datarecords.length === 0) {
        return res.status(404).json({ error: 'No records found for the given data reference.' });
      }

      const jsonResponse = {
        reference: records[0].reference,
        citation: records[0].citation,
        link: records[0].link,
        alink: records[0].alink,
        refs: datarecords.map(record => ({
          refNumber: record.refNumber,
          refText: record.refText
        }))
      };
      
      console.log("json reference -", jsonResponse);
      res.json(jsonResponse);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while fetching the data.' });
    }
  })
);

// ... [Your existing code]


const insertSentenceRec = async (sentenceRecord) => {
  console.log("debug sentence == ", sentenceRecord)
try {
    await sentenceRecord.save();
    return 1;  // Success
  } catch (err) {
    console.error("Error inserting record:", err);
    return 0;  // Failure
  }
};

// Function to update record in MongoDB
const updateSentenceRec = async (jsonDB, dbKey) => {
  try {
    await Sentence.updateOne({ dbKey: dbKey }, jsonDB);
    return 1;  // Success
  } catch (err) {
    console.error("Error updating record:", err);
    return 0;  // Failure
  }
};

const addSentenceDB = async (reference, header, sentencesString) => {
    // Find the latest headerSeq for the provided reference and header
    const latestRecord = await Sentence.findOne({
        'reference': reference,
        'header': header
    }).sort({ 'headerSeq': -1 });

    // Set the headerSeq for the new record. If no records exist, start at 1. Otherwise, increment the latest headerSeq by 1.
    const headerSeq = latestRecord ? latestRecord.headerSeq + 1 : 1;

    const individualSentences1 = sentencesString.split('||||||').map(sentence => ({ sentence: sentence.trim() }));
    
const individualSentences = sentencesString.split('||||||')
    .map(sentence => sentence.trim()) 
    .filter(sentence => sentence !== '')  // This line filters out empty strings
    .map(sentence => ({ sentence: sentence }));

console.log("sentences ===== ", individualSentences);
	const dbKey = `${reference}-${headerSeq}`; 

    const jsonDB = {
        dbKey: dbKey,
        reference: reference,
        header: header,
        headerSeq: headerSeq,
        sentences: individualSentences
    };

    const sentenceRecord = new Sentence(jsonDB);
    let rtn = await insertSentenceRec(sentenceRecord);
    return rtn;
}

app.post("/addSentence", cors(), asyncHandler(async (req, res) => {
    const { reference, header, sentences } = req.body;

    if (!reference || !header || !sentences) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        const result = await addSentenceDB(reference, header, sentences);
        if (result === 1) {
            res.status(200).json({ message: 'Successfully added the sentence data.' });
        } else {
            res.status(500).json({ error: 'Failed to add the sentence data.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while processing the request.' });
    }
}));
// Sample API Endpoint

 

app.get("/ping", cors(),
  asyncHandler(async (req, res, next) => {

  console.log('nodejs ccalled');
        res.json({ message: "pong" });
  }));

app.post("/addRefAPI", cors(),
  asyncHandler(async (req, res, next) => {
   console.log("reached func");
	  const dbKey = req.body.dbKey;
    const reference = req.body.reference;
    const citation = req.body.citation;
    const link = req.body.link;
    const alink = req.body.alink;
//	  const refNumber = parseInt(req.body.refNumber, 10);
    const refText = req.body.refText;

    console.log(req.body);

    const keyDbKey = dbKey + "Key";
    await insertKeyData(keyDbKey, reference + "Key", citation, link, alink);

const latestRefRecord = await refDBRec.findOne({
        'reference': reference
    }).sort({ 'refNumber': -1 });

    // Set the refNumber for the new record. If no records exist, start at 1. Otherwise, increment the latest refNumber by 1.
    const refNumber = latestRefRecord ? latestRefRecord.refNumber + 1 : 1;

    const rtn = await addRefDB (
      dbKey,
      reference,
      citation,
      link,
      alink,
      refNumber,
      refText
    );

    res.json({ rtn: rtn });
  })
);



const httpsServer = https.createServer(credentials, app);
const httpServer = http.createServer(app);

httpsServer.listen(3000, () => {
//httpServer.listen(3000, () => {
  console.log("HTTPS Server running on port 3000");
});

