const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore();
const projectName = process.env.PROJECT_NAME || 'saws';

const keyByCollection = {
  users: 'userId',
  appointments: 'appointmentId',
  services: 'serviceId',
  feedback: 'feedbackId',
  'support-messages': 'messageId'
};

exports.handler = async (event) => {
  console.log('DynamoDB event: ', JSON.stringify(event, null, 2));
  
  for (const record of event.Records) {
    if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
      const newImage = record.dynamodb.NewImage;
      // Convert DynamoDB JSON to standard JSON (simplified for brevity)
      const data = {};
      for (const key in newImage) {
         if (newImage[key].S) data[key] = newImage[key].S;
         if (newImage[key].N) data[key] = Number(newImage[key].N);
         if (newImage[key].BOOL !== undefined) data[key] = newImage[key].BOOL;
      }
      
      // Prevent infinite loop: if the record came from Firestore, ignore it.
      if (data._source === 'firestore') {
         console.log('Skipping record originating from Firestore to prevent loop.');
         continue;
      }
      
      data._source = 'dynamodb';
      
      // We assume the table name gives us the collection name
      const tableName = record.eventSourceARN.split(':')[5].split('/')[1];
      const collectionName = tableName.replace(`${projectName}-`, '');
      const docId = data[keyByCollection[collectionName]] || record.dynamodb.Keys[Object.keys(record.dynamodb.Keys)[0]].S;
      
      await firestore.collection(collectionName).doc(docId).set(data, { merge: true });
      console.log(`Synced ${docId} to Firestore collection ${collectionName}`);
    } else if (record.eventName === 'REMOVE') {
      const keys = record.dynamodb.Keys;
      const docId = keys[Object.keys(keys)[0]].S;
      const tableName = record.eventSourceARN.split(':')[5].split('/')[1];
      const collectionName = tableName.replace(`${projectName}-`, '');
      
      await firestore.collection(collectionName).doc(docId).delete();
      console.log(`Deleted ${docId} from Firestore collection ${collectionName}`);
    }
  }
};
