import { createRequire } from "module";
const require = createRequire(import.meta.url);
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/peacio');

const referenceSchema = new mongoose.Schema({
  dbKey: { type: String, default: null },
  reference: { type: String, default: null },
  citation: { type: String, default: null },
  link: { type: String, default: null },
  alink: { type: String, default: null },
  refNumber: { type: String, default: null },
  refText: { type: String, default: null },
});

const ReferenceModel = mongoose.model('Reference', referenceSchema);
 
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


const addRefDB  = async  (
   dbKey,
    reference,
    citation,
    link,
    alink,
    refNumber,
    refText
 ) => {

         let jsonDB= {
		 dbKey: dbKey,
		 reference: reference,
		 citation: citation,
		 link: link,
		 alink: alink,
		 refNumber: refNumber,
		 refText: refText
         };
         let refRec = new refDBRec (jsonDB);
         console.log(refRec);
         let rtn = 0;
         var found = false; 
         found = await refDBRec.findOne({'dbKey': dbKey});
         if (found) 
           rtn = await updateRec(jsonDB, dbKey);
         else 
           rtn = await insertRec(refRec);

         
         return rtn;

}
 

app.get("/ping", cors(),
  asyncHandler(async (req, res, next) => {

  console.log('nodejs ccalled');
        res.json({ message: "pong" });
  }));

app.post("/addRefAPI", cors(),
  asyncHandler(async (req, res, next) => {
    const dbKey = req.body.dbKey;
    const reference = req.body.reference;
    const citation = req.body.citation;
    const link = req.body.link;
    const alink = req.body.alink;
    const refNumber = req.body.refNumber;
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

