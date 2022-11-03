module.exports = { getDynamoDbClient, getFromTable, batchGetFromTable, scanTable, queryTable, updateTable, putInTable, deleteInTable }

function getDynamoDbClient() {
  const AWS = require("aws-sdk");
  var credentials = new AWS.SharedIniFileCredentials({profile: 'ece567-project-account'});
  AWS.config.credentials = credentials;
  return new AWS.DynamoDB.DocumentClient();  
}

function getFromTable(documentClient, params){
  try {
    // console.log('getFromTable', params);
    return documentClient.get(params).promise();
  } catch (err) {
    return err;
  }
}

function batchGetFromTable(documentClient, params){
  try {
    // console.log('batchGetFromTable', params);
    return documentClient.batchGet(params).promise();
  } catch (err) {
    return err;
  }
}

function scanTable(documentClient, params){
  try {
    // console.log('scanTable', params);
    return documentClient.scan(params).promise();
  } catch (err) {
    return err;
  }
}

function queryTable(documentClient, params){
  try {
    // console.log('queryTable', params);
    return documentClient.query(params).promise();
  } catch (err) {
    return err;
  }
}

function updateTable(documentClient, params){
  try {
    // console.log('updateTable', params);
    return documentClient.update(params).promise();
  } catch (err) {
    return err;
  }
}

function putInTable(documentClient, params){
  try {
    // console.log('putInTable', params);
    return documentClient.put(params).promise();
  } catch (err) {
    return err;
  }
}

function deleteInTable(documentClient, params){
  try {
    // console.log('deleteInTable', params);
    return documentClient.delete(params).promise();
  } catch (err) {
    return err;
  }
}