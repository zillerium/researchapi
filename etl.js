import mongoose from 'mongoose';
import fs from 'fs';

mongoose.connect('mongodb://127.0.0.1:27017/refs');

const referenceSchema = new mongoose.Schema({
  dbKey: { type: String, default: null },
  reference: { type: String, default: null },
  citation: { type: String, default: null },
  link: { type: String, default: null },
  alink: { type: String, default: null },
  refNumber: { type: String, default: null },
  refText: { type: String, default: null },
});

const refDBRec = mongoose.model('Reference', referenceSchema);

const extractDataToFile = async (referenceName) => {
    const records = await refDBRec.find({reference: referenceName}).sort({refNumber: 1});
    
    if (!records || records.length === 0) {
        console.log(`No records found for reference: ${referenceName}`);
        return;
    }

    const formattedData = records.map(record => {
        return `'[${record.refNumber}]': {\n\t\tdetails: '${record.refText}'\n\t},`;
    }).join('\n');

    fs.writeFileSync('extractdata.txt', formattedData, 'utf8');
    console.log(`Data extracted to extractdata.txt for reference: ${referenceName}`);
};

extractDataToFile('ref1').then(() => {
    console.log('Extraction complete.');
    mongoose.connection.close();  // Close the database connection
    process.exit(0);  // End the script
});

