const express = require('express');
const path = require('path');
const router = express.Router();
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');

const ddb = dynamo.getDynamoDbClient();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
});

router.post('/addRestaurant', async function(req,res,next){
  const {restaurant_id, restaurant_name, restaurant_address, open_time, close_time, contact, cuisine, rating, minimum_order} = req.body
  try {
      const addRestaurantQuery = ddbQueries.putRestaurant(restaurant_id, restaurant_name, restaurant_address, open_time, close_time, contact, cuisine, rating, minimum_order);
      const addRestaurant = await dynamo.putInTable(ddb, addRestaurantQuery);
      res.json({message:'Successfully put restaurant', query: addRestaurantQuery, queryResult: addRestaurant})
  } catch(err) {
      console.log(err)
      res.send({message:'Unable to add restaurant', error: err})
  }
});

router.post('/deleteRestaurant', async function(req,res,next){
  const {restaurant_id} = req.body
  try {
      const deleteRestaurantQuery = ddbQueries.deleteRestaurant(restaurant_id);
      const deleteRestaurant = await dynamo.deleteInTable(ddb, deleteRestaurantQuery);
      res.json({message:'Successfully deleted restaurant', query: deleteRestaurantQuery, queryResult: deleteRestaurant})
  } catch(err) {
      console.log(err)
      res.send({message:'Unable to delete restaurant', error: err})
  }
});

router.post('/addCoupon', async function(req,res,next){
  const {restaurant_id, coupon_id, coupon_value, expiration_time} = req.body
  try {
      const addCouponQuery = ddbQueries.putCoupon(restaurant_id, coupon_id, coupon_value, true, expiration_time);
      const addCoupon = await dynamo.putInTable(ddb, addCouponQuery);
      res.json({message:'Successfully put coupon', query: addCouponQuery, queryResult: addCoupon})
  } catch(err) {
      console.log(err)
      res.send({message:'Unable to add coupon', error: err})
  }
});

router.post('/deleteCoupon', async function(req,res,next){
    const {restaurant_id, coupon_id} = req.body
    try {
        const deleteCouponQuery = ddbQueries.deleteCoupon(restaurant_id, coupon_id);
        const deleteCoupon = await dynamo.deleteInTable(ddb, deleteCouponQuery);
        res.json({message:'Successfully deleted coupon', query: deleteCouponQuery, queryResult: deleteCoupon})
    } catch(err) {
        console.log(err)
        res.send({message:'Unable to delete coupon', error: err})
    }
});

router.post('/viewCoupons', async function(req,res,next){
    const {restaurant_id} = req.body
    try {
        const viewCouponsQuery = ddbQueries.queryCouponsForRestaurant(restaurant_id);
        const viewCoupons = await dynamo.queryTable(ddb, viewCouponsQuery);
        res.json(viewCoupons.Items)
    } catch(err) {
        console.log(err)
        res.send({message:'Unable to retrieve coupons', error: err})
    }
});

module.exports = router;