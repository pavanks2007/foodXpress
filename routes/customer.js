const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');
const fs = require('fs');

const ddb = dynamo.getDynamoDbClient();

/* GET home page. */
router.get('/', async function(req, res, next) {
  res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
});

router.post('/restaurants', async function(req, res, next) {
  const restaurants = await dynamo.queryTable(ddb, ddbQueries.queryListOfRestaurants());
  res.json(restaurants.Items);
});

module.exports = router;