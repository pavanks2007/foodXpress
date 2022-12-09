const express = require('express');
const path = require('path');
const router = express.Router();
var expressValidator = require('express-validator');
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');
const fs = require('fs');

const ddb = dynamo.getDynamoDbClient();

router.get('/', function(req,res)   // This still needs some work once cookie handler is finished
{
    res.redirect('customer/dashboard')
})

/* GET home page. */
router.get('/dashboard', async function (req, res, next) 
{
    res.render('customer/customer-dashboard.ejs', { root: path.join(__dirname, '..', 'views') });
})

router.get('/restaurants', async function (req, res, next) {
    console.log(req.signedCookies);
    try {
        if (!req.signedCookies) {
            res.redirect('/')
        } else {
            const customer_id = req.signedCookies.user_id;
            const customerDetails = await dynamo.getFromTable(ddb, ddbQueries.getUserDetails(customer_id));
            const restaurants = await dynamo.queryTable(ddb, ddbQueries.queryListOfRestaurants());
            restaurants.Items.forEach(function(restaurant) {
                if (
                    restaurant.hasOwnProperty(constants.LATITUDE) && 
                    restaurant.hasOwnProperty(constants.LONGITUDE) && 
                    customerDetails.Item.hasOwnProperty(constants.LATITUDE) && 
                    customerDetails.Item.hasOwnProperty(constants.LONGITUDE)
                ) {
                    restaurant[constants.DISTANCE] = getDistanceInMiles(
                        restaurant[constants.LATITUDE],
                        restaurant[constants.LONGITUDE],
                        customerDetails.Item[constants.LATITUDE],
                        customerDetails.Item[constants.LONGITUDE]
                    ).toFixed(4);
                } else {
                    restaurant[constants.DISTANCE] = 15;
                }
                restaurant[constants.RESTAURANT_ID] = restaurant[constants.SORT_KEY];
                if(!restaurant.hasOwnProperty(constants.RATING))
                    restaurant[constants.RATING] = 3.8;
                delete restaurant[constants.SORT_KEY];
            });
            allRestaurants = restaurants.Items.sort((a,b) => a.distance - b.distance);
            featuredRestaurants = restaurants.Items.sort((a,b) => b.rating - a.rating).slice(0, 5);
            res.render("customer/customer-restaurants",{ featuredRestaurants: featuredRestaurants, allRestaurants:allRestaurants} );
        }
    } catch (err) {
        console.log(err);
        res.send({ message: 'Unable to view restaurants', error: err });
    }
});

router.get('/profile',function (req, res)
{
    res.sendFile('customer/customer-profile.html', { root: path.join(__dirname, '..', 'views') });
})

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

router.get('/orderFees', async function (req, res, next) {
    res.json({ taxes: 0.14, surge_fees: 3});
});

// router.post('/orderConfirmation', async function (req, res, next) {
//     const { order_id, customer_id, restaurant_id, items_price, taxes, surge_fee, total_tip, coupon_used, coupon_value, final_price, mode } = req.body;
//     const createdAt = new Date().toString();
//     const driver_id = await dynamo.scanTable(ddb, ddbQueries.getAvailableDriver());
//     console.log(driver_id.Items);
//     try {
//         const checkout = await dynamo.putInTable(ddb, ddbQueries.putOrderSummary(order_id, customer_id, restaurant_id, driver_id, items_price, taxes, surge_fee, total_tip, coupon_used, coupon_value, final_price, mode, createdAt));
//         res.json({ message: 'Successfully checkout out and added order summary: ' + checkout });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ err: 'Something went wrong', error: err });
//     }
// });

router.post('/orderConfirmation', async function (req, res, next) {
    const { order_id, customer_id, restaurant_id, items_price, taxes, surge_fee, total_tip, coupon_used, coupon_value, final_price, mode } = req.body;
    const createdAt = new Date().toString();
    const driver_id_list = await dynamo.scanTable(ddb, ddbQueries.scanAvailableDriver());
    let driver_id = driver_id_list.Items[0].driver_id.toString();
    console.log(driver_id_list.Items[0].driver_id);
    try {
        const checkout = await dynamo.putInTable(ddb, ddbQueries.putOrderSummary(order_id, customer_id, restaurant_id, driver_id, items_price, taxes, surge_fee, total_tip, coupon_used, coupon_value, final_price, mode, createdAt));
        res.json({ message: 'Successfully checkout out and added order summary: ' + checkout });
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
    }
});

router.post('/payment', async function (req, res, next) {
});

router.post('/reviews', async function (req, res, next) {
    const { customer_id, restaurant_id, review, rating } = req.body;
    const createdAt = new Date().toString();
    console.log(req);
    try {
        const review_post = await dynamo.putInTable(ddb, ddbQueries.putReviewForRestaurant(customer_id, restaurant_id, createdAt, review, rating));
        res.json({ message: 'Successfully checkout out and added order summary: ' + review_post });
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
    }
});

router.get('/previous_orders', async function (req, res, next) {
    //const { customer_id } = req.params.rID
    //const previous_orders = await dynamo.queryTable(ddb, ddbQueries.queryPreviousOrdersForCustomer(customer_id));
    res.sendFile('customer/customer-previous-orders.html', { root: path.join(__dirname, '..', 'views') });
});
    
router.post('/previousOrders', async function (req, res, next) {
    const { customer_id } = req.body
    const previous_orders = await dynamo.queryTable(ddb, ddbQueries.queryPreviousOrdersForCustomer(customer_id));
    res.json(previous_orders.Items);
});

router.post('/order', async function (req, res, next) {
    const { customer_id, order_id } = req.body;
    const order_summary = await dynamo.getFromTable(ddb, ddbQueries.getOrderSummaryForCustomer(order_id));
    if (!order_summary.Item.hasOwnProperty(constants.CUSTOMER_ID)) 
        throw `No driver assigned to order ${order_id}`;
    if (customer_id != order_summary.Item[constants.CUSTOMER_ID])
        throw `Order ${order_id} is not ordered by customer ${customer_id}`;
    const order_items = await dynamo.queryTable(ddb, ddbQueries.queryOrderItems(order_id));
    res.json({ order_summary: order_summary.Item, order_items: order_items.Item });
});

router.get('/order/:id', async function (req, res, next) {
    const id = req.params.id;
    try {
        const order_summary = await dynamo.getFromTable(ddb, ddbQueries.getOrderSummaryForCustomer(id));
        res.json(order_summary.Item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
    }
});

router.get('/getUserDetails/:id', async function (req, res, next) {
    try {
        const users = await dynamo.getFromTable(ddb, ddbQueries.queryGetCustomer(id));
        res.json(users.Item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
    }
});

router.post('/addUser', async function (req, res, next) {
    const { user_name, email, address, password, confirmedPassword } = req.body;
    const createdAt = new Date().toString();
    const user_type = 'Customer';
    //const encryptedCredential="Rutgers@123";
    // Validation
    req.checkBody('user_name', 'Name is required').notEmpty();
    req.checkBody('email', 'Email is required').notEmpty();
    req.checkBody('email', 'Email is not valid').isEmail();
    req.checkBody('password', 'Password is required').notEmpty();
    req.checkBody('confirmedPassword', 'Passwords do not match').equals(req.body.password);
    const user_id = 'rt67';
    try {
        const newCustomer = await dynamo.putInTable(ddb, ddbQueries.putCustomer(user_id, user_name, email, user_type, createdAt, address, password));
        res.json({ message: 'Successfully added user: ' + newCustomer });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err });
    }
});

router.post('/deleteUser', async function (req, res, next) {
    const { user_id } = req.body
    try {
        const deleteUserQuery = ddbQueries.deleteUser(user_id);
        const deleteUser = await dynamo.deleteInTable(ddb, deleteUserQuery);
        res.json({ message: 'Successfully deleted user', query: deleteUserQuery, queryResult: deleteUser })
    } catch (err) {
        console.log(err)
        res.send({ message: 'Unable to delete user', error: err })
    }
});

function getDistanceInMiles(lat1, lon1, lat2, lon2){
    var R = 6378.137; // Radius of earth in KM
    var dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
    var dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d/1.609;
}

module.exports = router;