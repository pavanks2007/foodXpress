const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');
const fs = require('fs');
const { putCustomer,queryListOfCustomers } = require('./query.js');

const ddb = dynamo.getDynamoDbClient();

/* GET home page. */
router.get('/', async function(req, res, next) {
  res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
});

router.get('/restaurants', async function(req, res, next) {
  const restaurants = await dynamo.queryTable(ddb, ddbQueries.queryListOfRestaurants());
  res.json(restaurants.Items);
});

router.get('/:id', async function(req, res, next) {
  const id = req.params.id;
  console.log(id)
  try {
  const users = await dynamo.getFromTable(ddb, ddbQueries.queryGetCustomer(id));
  res.json(users.Items);
} catch(err) {
  console.error(err);
      res.status(500).json({ err: 'Something went wrong' });
}
});


router.post('/list', async function(req, res, next) {
  
  const {user_id,user_name, user_type,address} = req.body
  console.log(user_id,user_name, user_type,address)
  const createdAt = new Date()
  const encryptedCredential="Rutgers@123"
  try{
    const newCustomer=await dynamo.putInTable(ddb, ddbQueries.putCustomer(user_id,user_name,user_type,createdAt,address,encryptedCredential));
    res.json(newCustomer);
  } catch (err) {
      console.error(err);
      res.status(500).json({ err: 'Something went wrong' });
  }
});

router.post('/menu',async function(req,res,next)
{
  const {restaurant_id, item_id, description, item_name, item_price} = req.body
  console.log(restaurant_id, item_id, description, item_name, item_price)
    try
    {
        const viewMenu= await dynamo.putInTable(ddb, ddbQueries.putMenu(restaurant_id, item_id, description, item_name, item_price))
        console.log(viewMenu.Items)
        res.json({message:'Successfully pulled Menu', data: viewMenu.Items})
    }
    catch(err)
    {
        console.log(err)
        res.send('Unable to pull Menu')
    }
});

module.exports = router;