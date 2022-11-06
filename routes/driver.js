const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');

const ddb = dynamo.getDynamoDbClient();

router.get('/dashboard', function(req, res, next) {
  // TODO dashboard page
  res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
});

router.post('/dashboard', async function(req, res, next) {
  
});

router.get('/previous_orders', function(req, res, next) {
  // TODO previous_orders page
  res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
});

router.post('/previous_orders', async function(req, res, next) {
  const {driver_id} = req.body
  const previous_orders = await dynamo.queryTable(ddb, ddbQueries.queryPreviousOrdersForDriver(driver_id));
  res.json(previous_orders.Items);
});

router.get('/order', async function(req, res, next) {
  // TODO order details page
  const restaurantId = "R_04";
  const menu_items = await dynamo.queryTable(ddb, ddbQueries.queryMenuItemsInRestaurant(restaurantId));
  // console.log(menu_items);
  const coupons = await dynamo.queryTable(ddb, ddbQueries.queryCouponsForRestaurant(restaurantId));
  console.log(coupons);
  res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
});

router.post('/order', async function(req, res, next) {
  const driverId = '';
  const orderId = '';
  const order_summary = await dynamo.getFromTable(ddb, ddbQueries.getOrderSummaryForDriver(orderId));
  if (order_summary.Item.hasOwnProperty(constants.DRIVER_ID) && driverId == order_summary.Item[constants.DRIVER_ID]) {
    const order_items = await dynamo.queryTable(ddb, ddbQueries.queryOrderItems(orderId));
    res.json({order_summary: order_summary.Item, order_items: order_items.Item});
  } else {
    // TODO error
  }
});

module.exports = router;