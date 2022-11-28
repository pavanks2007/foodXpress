const express = require('express');
const path = require('path');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile('index.html', { root: path.join(__dirname, '..', 'views') });
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

module.exports = router;