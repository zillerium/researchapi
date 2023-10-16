import mongoose from 'mongoose';
import fs from 'fs';

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

const dbRef = 'HumbelDeGov';  // Declare the reference name as a variable at the top

const extractDataToFile = async (referenceName) => {
    const records = await refDBRec.find({reference: referenceName}).sort({refNumber: 1});
    
    if (!records || records.length === 0) {
        console.log(`No records found for reference: ${referenceName}`);
        return;
    }

    let globalVar = `const REFERENCE_NAME = "${referenceName}";\n\n`;
    const formattedData = records.map(record => {
        return `'[${record.refNumber}]': {\n\t\tdetails: '${record.refText}'\n\t},`;
    }).join('\n');

    const outputData = globalVar + formattedData;

    const fileName = `${referenceName}.txt`;
    fs.writeFileSync(fileName, outputData, 'utf8');
    console.log(`Data extracted to ${fileName} for reference: ${referenceName}`);
};

extractDataToFile(dbRef).then(() => {  // Use the variable in the function call
    console.log('Extraction complete.');
    mongoose.connection.close();  // Close the database connection
    process.exit(0);  // End the script
});

