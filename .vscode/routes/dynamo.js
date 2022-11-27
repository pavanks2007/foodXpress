module.exports = { getDynamoDbClient, getFromTable, batchGetFromTable, scanTable, queryTable, updateTable, putInTable, deleteInTable, deleteItems}

function getDynamoDbClient() {
  const AWS = require("aws-sdk");
  var credentials = new AWS.SharedIniFileCredentials({profile: 'ece567-project-account'});
  AWS.config.credentials = credentials;
  return new AWS.DynamoDB.DocumentClient({ region:'us-east-1' });  
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

async function deleteItems(tableName, pk_name, pk_value, sk_name) {
  const queryParams = {
    TableName: tableName,
    KeyConditionExpression: '#pk = :id',
    ExpressionAttributeNames: { '#pk': pk_name },
    ExpressionAttributeValues: { ':id': pk_value },
  };
  const queryResults = await docClient.query(queryParams).promise()
  if (queryResults.Items && queryResults.Items.length > 0) {
    const batchCalls = chunks(queryResults.Items, 25).map( async (chunk) => {
      const deleteRequests = chunk.map( item => {
        return {
          DeleteRequest : {
            Key : {
              [pk_name] : item[pk_name],
              [sk_name] : item[sk_name],
            }
          }
        }
      })
      const batchWriteParams = {
        RequestItems : {
          [tableName] : deleteRequests
        }
      }
      await docClient.batchWrite(batchWriteParams).promise()
    })
    await Promise.all(batchCalls)
  }
}