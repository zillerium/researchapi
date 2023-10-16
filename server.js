import { createRequire } from "module";
const require = createRequire(import.meta.url);
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/refs');

const referenceSchema = new mongoose.Schema({
  dbKey: { type: String, default: null },
  reference: { type: String, default: null },
  citation: { type: String, default: null },
  link: { type: String, default: null },
  alink: { type: String, default: null },
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

// ... [Your existing code]

app.get("/getRefData", cors(),
  asyncHandler(async (req, res, next) => {
    const referenceParam = req.query.reference;

    if (!referenceParam) {
      return res.status(400).json({ error: 'Reference parameter is required.' });
    }

    try {
      const records = await refDBRec.find({ reference: referenceParam });

      if (records.length === 0) {
        return res.status(404).json({ error: 'No records found for the given reference.' });
      }

      const jsonResponse = {
        reference: records[0].reference,
        citation: records[0].citation,
        link: records[0].link,
        alink: records[0].alink,
        refs: records.map(record => ({
          refNumber: record.refNumber,
          refText: record.refText
        }))
      };

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

