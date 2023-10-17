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


// ... [Your existing code]

app.get("/getRefData", cors(),
  asyncHandler(async (req, res, next) => {
    const keyreferenceParam = req.query.reference + "Key";
    const referenceParam = req.query.reference;

    if ((!referenceParam) || (!keyreferenceParam)) {
      return res.status(400).json({ error: 'Reference parameter is required.' });
    } else {
        console.log(" params are invalid ");
    }

    try {
      const records = await KeyRefDBRec.find({ reference: keyreferenceParam });

      if (records.length === 0) {
        return res.status(404).json({ error: 'No records found for the given key reference.' });
      } else {
        console.log("data record data found ");
    }

      const datarecords = await refDBRec.find({ reference: referenceParam });
      
      if (datarecords.length === 0) {
        return res.status(404).json({ error: 'No records found for the given data reference.' });
      }
	    const jsonResponse = {
        reference: records[0].reference,
        citation: records[0].citation,
        link: records[0].link,
        alink: records[0].alink,
        refs:datarecords.map(record => ({
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
	  const refNumber = parseInt(req.body.refNumber, 10);
    const refText = req.body.refText;

    console.log(req.body);

    const keyDbKey = dbKey + "Key";
    await insertKeyData(keyDbKey, reference + "Key", citation, link, alink);


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

