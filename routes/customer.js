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

router.get('/restaurants', async function(req, res, next) {
  const restaurants = await dynamo.queryTable(ddb, ddbQueries.queryListOfRestaurants());
  res.json(restaurants.Items);
});

router.post('/restaurant/items', async function(req, res, next) {
  const {restaurant_id} = req.body;
  const menuItems = await dynamo.queryTable(ddb, ddbQueries.queryMenuItemsInRestaurant(restaurant_id));
  res.json(menuItems.Items);
});

router.get('/getUserDetails/:id', async function(req, res, next) {
  const user_id = req.params.id;
  try {
    const users = await dynamo.getFromTable(ddb, ddbQueries.queryGetCustomer(id));
    res.json(users.Item);
  } catch(err) {
    console.error(err);
    res.status(500).json({ err: 'Something went wrong', error: err});
  }
});


router.post('/addUser', async function(req, res, next) {
  const {user_id, user_name, email, user_type, address} = req.body;
  const createdAt = new Date().toString();
  const encryptedCredential="Rutgers@123";
  try {
    const newCustomer = await dynamo.putInTable(ddb, ddbQueries.putCustomer(user_id, user_name, email, user_type, createdAt, address, encryptedCredential));
    res.json({message: 'Successfully added user: ' + user_id});
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: err });
  }
});

router.post('/deleteUser', async function(req,res,next)
{
  const {user_id} = req.body
  try {
      const deleteUserQuery = ddbQueries.deleteUser(user_id);
      const deleteUser = await dynamo.deleteInTable(ddb, deleteUserQuery);
      res.json({message:'Successfully deleted user', query: deleteUserQuery, queryResult: deleteUser})
  } catch(err) {
      console.log(err)
      res.send({message:'Unable to delete user', error: err})
  }
});

module.exports = router;