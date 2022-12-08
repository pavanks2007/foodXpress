const express = require('express');
const path = require('path');
const router = express.Router();
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');

const ddb = dynamo.getDynamoDbClient();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
});

router.get('/restaurants', async function (req, res, next) {
    try {
        const restaurants = await dynamo.queryTable(ddb, ddbQueries.queryListOfRestaurants());
        res.json(restaurants.Items);
    } catch (err) {
        console.log(err);
        res.send({ message: 'Unable to view restaurants', error: err });
    }
});

router.post('/restaurant/menu', async function (req, res, next) {
    try {
        const { restaurant_id } = req.body;
        const menuItems = await dynamo.queryTable(ddb, ddbQueries.queryMenuItemsInRestaurant(restaurant_id));
        res.json(menuItems.Items);
    } catch (err) {
        console.log(err);
        res.send({ message: 'Unable to view restaurant menu', error: err });
    }
});

router.post('/addRestaurant', async function (req, res, next) {
    try {
        const { restaurant_id, restaurant_name, restaurant_address, open_time, close_time, contact, cuisine, rating, minimum_order } = req.body;
        
        let coordinates;
        
        getCoordinates(restaurant_address).then(result => {
            coordinates = result;
          });
        
        const addRestaurantQuery = ddbQueries.putRestaurant(restaurant_id, restaurant_name, restaurant_address,coordinates[0],coordinates[1], open_time, close_time, contact, cuisine, rating, minimum_order);
        const addRestaurant = await dynamo.putInTable(ddb, addRestaurantQuery);
        res.json({ message: 'Successfully put restaurant', query: addRestaurantQuery, queryResult: addRestaurant })
    } catch (err) {
        console.log(err)
        res.send({ message: 'Unable to add restaurant', error: err })
    }
});

router.post('/deleteRestaurant', async function (req, res, next) {
    try {
        const { restaurant_id } = req.body;
        const deleteRestaurantQuery = ddbQueries.deleteRestaurant(restaurant_id);
        const deleteRestaurant = await dynamo.deleteInTable(ddb, deleteRestaurantQuery);
        res.json({ message: 'Successfully deleted restaurant', query: deleteRestaurantQuery, queryResult: deleteRestaurant })
    } catch (err) {
        console.log(err)
        res.send({ message: 'Unable to delete restaurant', error: err })
    }
});

router.post('/addCoupon', async function (req, res, next) {
    try {
        const { restaurant_id, coupon_id, coupon_value, expiration_time } = req.body;
        const addCouponQuery = ddbQueries.putCoupon(restaurant_id, coupon_id, coupon_value, true, expiration_time);
        const addCoupon = await dynamo.putInTable(ddb, addCouponQuery);
        res.json({ message: 'Successfully put coupon', query: addCouponQuery, queryResult: addCoupon })
    } catch (err) {
        console.log(err)
        res.send({ message: 'Unable to add coupon', error: err })
    }
});

router.post('/deleteCoupon', async function (req, res, next) {
    try {
        const { restaurant_id, coupon_id } = req.body;
        const deleteCouponQuery = ddbQueries.deleteCoupon(restaurant_id, coupon_id);
        const deleteCoupon = await dynamo.deleteInTable(ddb, deleteCouponQuery);
        res.json({ message: 'Successfully deleted coupon', query: deleteCouponQuery, queryResult: deleteCoupon })
    } catch (err) {
        console.log(err)
        res.send({ message: 'Unable to delete coupon', error: err })
    }
});

router.post('/viewCoupons', async function (req, res, next) {
    try {
        const { restaurant_id } = req.body;
        const viewCouponsQuery = ddbQueries.queryCouponsForRestaurant(restaurant_id);
        const viewCoupons = await dynamo.queryTable(ddb, viewCouponsQuery);
        res.json(viewCoupons.Items)
    } catch (err) {
        console.log(err)
        res.send({ message: 'Unable to retrieve coupons', error: err })
    }
});

function getCoordinates(address) {
    // Encode the address and add the API key to the URL
    let url2 = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key={ADDKEYHERE and remove curly thingies.}`;
  
    // Make the API request and process the response
    return fetch(url2)
      .then(response => response.json())
      .then(data => {
        // Extract the latitude and longitude from the API response
        let coordinates = Object.values(data.results[0].geometry.location);
        return coordinates;
      })
      .catch(err => {
        console.log(err);
      });
  }
  

module.exports = router;