const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dynamoToFirestore = fs.readFileSync(path.join(root, 'database-mirroring', 'dynamodb-to-firestore.js'), 'utf8');
const firestoreToDynamo = fs.readFileSync(path.join(root, 'database-mirroring', 'firestore-to-dynamodb.js'), 'utf8');

assert.ok(dynamoToFirestore.includes("_source === 'firestore'"), 'DynamoDB-to-Firestore mirror should skip Firestore-origin records');
assert.ok(dynamoToFirestore.includes("data._source = 'dynamodb'"), 'DynamoDB-to-Firestore mirror should mark DynamoDB-origin records');
assert.ok(dynamoToFirestore.includes("'support-messages': 'messageId'"), 'DynamoDB-to-Firestore mirror should map support message keys');
assert.ok(dynamoToFirestore.includes('.set(data, { merge: true })'), 'DynamoDB-to-Firestore mirror should upsert documents');
assert.ok(dynamoToFirestore.includes('.delete()'), 'DynamoDB-to-Firestore mirror should delete removed documents');

assert.ok(firestoreToDynamo.includes("_source === 'dynamodb'"), 'Firestore-to-DynamoDB mirror should skip DynamoDB-origin records');
assert.ok(firestoreToDynamo.includes("item._source = 'firestore'"), 'Firestore-to-DynamoDB mirror should mark Firestore-origin records');
assert.ok(firestoreToDynamo.includes('firestoreValueToJson'), 'Firestore-to-DynamoDB mirror should normalize Firestore value types');
assert.ok(firestoreToDynamo.includes('dynamoDb.put'), 'Firestore-to-DynamoDB mirror should upsert DynamoDB records');
assert.ok(firestoreToDynamo.includes('dynamoDb.delete'), 'Firestore-to-DynamoDB mirror should delete removed records');

console.log('database mirroring tests passed');