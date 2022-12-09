const express = require('express');
const path = require('path');
const constants = require('./constants.js');
const router = express.Router();
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');
const user_type = constants.ADMIN;

const ddb = dynamo.getDynamoDbClient();

/* GET home page. */
router.get('/', async function (req, res) {
    // TODO create dashboard
    res.redirect(`/admin/dashboard`)
});

router.get('/restaurants', async function (req, res, next) {
    try {
        const restaurants = await dynamo.queryTable(ddb, ddbQueries.queryListOfRestaurants());
        restaurants.Items.forEach(function(restaurant) {
            restaurant[constants.RESTAURANT_ID] = restaurant[constants.SORT_KEY];
            if(!restaurant.hasOwnProperty(constants.RATING))
                restaurant[constants.RATING] = constants.DEFAULT_RATING;
            delete restaurant[constants.SORT_KEY];
        });
        allRestaurants = restaurants.Items;
        featuredRestaurants = allRestaurants.sort((a,b) => b.rating - a.rating).slice(0, constants.DEFAULT_NUMBER_OF_FEATURED_RESTAURANTS);
        res.render("general/restaurants", { featuredRestaurants: featuredRestaurants, allRestaurants:allRestaurants, user_type: user_type} );
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

    let { restaurant_id, restaurant_name, restaurant_address, open_time, close_time, contact, cuisine, rating, minimum_order } = req.body;
        /*push lat and long*/

        try
        {
            restaurant_address="600 Commons Way Bldg. E, Bridgewater Township, NJ 08807"
           
            
            let url2 = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(restaurant_address)}&key=AIzaSyCSCk3BE2UzEdCR0-NcWzmnD2dTCv3Jcsg`;

        try {
            // Make the API request and process the response
            let response = await fetch(url2);

            // Check the response status code
            if (response.status !== 200) {
            throw new Error(`Request failed with status code: ${response.status}`);
            }

            let data = await response.json();
            // Extract the latitude and longitude from the API response
            let coordinates = Object.values(data.results[0].geometry.location);

            console.log(coordinates)

            //const addRestaurantQuery = ddbQueries.putRestaurant(restaurant_id, restaurant_name, restaurant_address,coordinates[0],coordinates[1], open_time, close_time, contact, cuisine, rating, minimum_order);
           // const addRestaurant = await dynamo.putInTable(ddb, addRestaurantQuery);
        } catch (err) 
        {
            throw err;
        }
        }
        catch(err)
        {
            console.log('error is: '+err)
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

router.post('/updateRestaurant', async function(req,res)
{
    
    let {r_id,whatToUpdate,whatTochangeItTo}= req.body;
    let {whatToUpdate2,whatTochangeItTo2}= req.body;
    let {whatToUpdate3,whatTochangeItTo3}= req.body;
    let {whatToUpdate4,whatTochangeItTo4}= req.body;
    let {whatToUpdate5,whatTochangeItTo5}= req.body;

    try{
        const updateRestaurantDetailQuery = ddbQueries.updateRestaurantDetail(r_id, whatToUpdate, whatTochangeItTo);
        const updateRestaurantDetail = await dynamo.updateTable(ddb, updateRestaurantDetailQuery);
        const updateRestaurantDetailQuery2 = ddbQueries.updateRestaurantDetail(r_id, whatToUpdate2, whatTochangeItTo2);
        const updateRestaurantDetail2 = await dynamo.updateTable(ddb, updateRestaurantDetailQuery2);
        const updateRestaurantDetailQuery3 = ddbQueries.updateRestaurantDetail(r_id, whatToUpdate3, whatTochangeItTo3);
        const updateRestaurantDetail3 = await dynamo.updateTable(ddb, updateRestaurantDetailQuery3);
        const updateRestaurantDetailQuery4 = ddbQueries.updateRestaurantDetail(r_id, whatToUpdate4, whatTochangeItTo4);
        const updateRestaurantDetail4 = await dynamo.updateTable(ddb, updateRestaurantDetailQuery4);
        const updateRestaurantDetailQuery5 = ddbQueries.updateRestaurantDetail(r_id, whatToUpdate5, whatTochangeItTo5);
        const updateRestaurantDetail5 = await dynamo.updateTable(ddb, updateRestaurantDetailQuery5);
    }
    catch(e){
        console.log(e);
    }
    // console.log('updated values')
});

function validateCookie(signedCookies) {
    try {
        return signedCookies && signedCookies[constants.USER_TYPE] == constants.ADMIN
    } catch (error) {
        return false
    }
}

module.exports = router;