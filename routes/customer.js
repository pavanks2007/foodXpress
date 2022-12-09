const express = require('express');
const path = require('path');
const router = express.Router();
var expressValidator = require('express-validator');
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');
const fs = require('fs');
const paypal = require('paypal-rest-sdk');
const user_type = constants.CUSTOMER;

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'AaMQhQJJ9rbV2fBrTSiYLMEhZMx4Dxq26JGawovRBbRW24dMLtJ7_171Zy78QAO3mjjCNIh85eIziQNn',
    'client_secret': 'EMfiAVH-mVnTRGctW029hm3rrOpO7AVaXyI4790ZvwJrbslZ0T2OyFq5ZlhCbfBI0i4Vak7o4zK0NxTF'
});

const accountSid = 'AC24363df7efae2d43927f757719479774';
const authToken = '4e8a88c1a07ade0d62dfdf8251c06289';
const client = require("twilio")(accountSid, authToken);

const ddb = dynamo.getDynamoDbClient();

router.get('/', function(req,res) {
    res.redirect('/customer/restaurants')
})

/* GET home page. */
router.get('/dashboard', async function (req, res, next) {
    // TODO create dashboard
    res.render('customer/dashboard', {user_type: user_type});
})

router.get('/restaurants', async function (req, res, next) {
    try {
        const customer_id = req.signedCookies.user_id;
        const customerDetails = await dynamo.getFromTable(ddb, ddbQueries.getUserDetails(customer_id));
        const restaurants = await dynamo.queryTable(ddb, ddbQueries.queryListOfRestaurants());
        restaurants.Items.forEach(function(restaurant) {
            if (restaurant.hasOwnProperty(constants.LATITUDE) && restaurant.hasOwnProperty(constants.LONGITUDE) && customerDetails.Item.hasOwnProperty(constants.LATITUDE) && customerDetails.Item.hasOwnProperty(constants.LONGITUDE)) {
                restaurant[constants.DISTANCE] = getDistanceInMiles(restaurant[constants.LATITUDE], restaurant[constants.LONGITUDE],customerDetails.Item[constants.LATITUDE],customerDetails.Item[constants.LONGITUDE]).toFixed(4);
            } else {
                restaurant[constants.DISTANCE] = 15;
            }
            restaurant[constants.RESTAURANT_ID] = restaurant[constants.SORT_KEY];
            if(!restaurant.hasOwnProperty(constants.RATING))
            restaurant[constants.RATING] = constants.DEFAULT_RATING;
            delete restaurant[constants.SORT_KEY];
        });
        allRestaurants = restaurants.Items.sort((a,b) => a.distance - b.distance);
        featuredRestaurants = allRestaurants.sort((a,b) => b.rating - a.rating).slice(0, constants.DEFAULT_NUMBER_OF_FEATURED_RESTAURANTS);
        res.render("customer/restaurants",{ featuredRestaurants: featuredRestaurants, allRestaurants:allRestaurants, user_type: user_type});
    } catch (err) {
        console.log(err);
        res.send({ message: 'Unable to view restaurants', error: err });
    }
});

router.get('/restaurants/:params', async function (req, res, next) {
    try {
        const restaurant_id = req.params.params;
        const restaurantDetails = await dynamo.getFromTable(ddb, ddbQueries.getRestaurantDetails(restaurant_id));
        restaurantDetails.Item[constants.RESTAURANT_ID] = restaurantDetails.Item[constants.SORT_KEY];
        const menuItems = await dynamo.queryTable(ddb, ddbQueries.queryMenuItemsInRestaurant(restaurant_id));
        res.render('general/view-menu', {restaurantDetails: restaurantDetails.Item, items: menuItems.Items, user_type: user_type});
    } catch (err) {
        console.log(err);
        res.send({ message: 'Unable to view restaurant menu', error: err });
    }
});

router.get('/dashboard',function (req, res){
    res.render('customer/profile', {user_type: user_type});
});

router.post('/orderPayment', async (req, res) => {
    const customer_id = req.signedCookies.user_id;
    const {restaurant_id, items_price, taxes, surge_fee, total_tip, coupon_used, coupon_value, final_price, mode, items} = req.body;
    console.log("final_price", final_price);
    const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "http://localhost:3000/customer/orderPayment/success",
            "cancel_url": "http://localhost:3000/customer/orderPayment/cancel"
        },
        "transactions": [{
            "amount": {
                "currency": "USD",
                "total": final_price
            },
            "description": ""
        }]
    };
    
    let order_id = "";
    let redirectUrl = "";
    
    paypal.payment.create(create_payment_json, async function (error, payment) {
        if (error) {
            throw error;
        } else {
            for(let i = 0;i < payment.links.length;i++){
                if(payment.links[i].rel === 'self') {
                    order_id = payment.links[i].href.substring("https://api.sandbox.paypal.com/v1/payments/payment/".length);
                }
                if(payment.links[i].rel === 'approval_url'){
                    redirectUrl = payment.links[i].href;
                }
            }
            const createdAt = new Date().toString();
            // Add order summary with status as PROCESSING
            await dynamo.putInTable(ddb, ddbQueries.putOrderSummary(order_id, customer_id, restaurant_id, items_price, taxes, surge_fee, total_tip, coupon_used, coupon_value, final_price, mode, createdAt, constants.PROCESSING));
            items.forEach(async function(item) {
                // Add order items
                await dynamo.putInTable(ddb, ddbQueries.putItemInOrders(restaurant_id, order_id, item["item_id"], item["item_name"], item["item_price"], item["quantity"]));
            })
            res.json({redirect: redirectUrl});
        }
    });
    
});

router.get('/orderPayment/success', async (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
    
    const orderSummary = await dynamo.getFromTable(ddb, ddbQueries.getOrderSummaryForCustomer(paymentId));
    const finalPrice = orderSummary.Item[constants.FINAL_PRICE]
    console.log(finalPrice);
    
    const execute_payment_json = {
        "payer_id": payerId,
        "transactions": [{
            "amount": {
                "currency": "USD",
                "total": finalPrice
            }
        }]
    };
    
    // Obtains the transaction details from paypal
    paypal.payment.execute(paymentId, execute_payment_json, async function (error, payment) {
        //When error occurs when due to non-existent transaction, throw an error else log the transaction details in the console then send a Success string reposponse to the user.
        if (error) {
            console.log(error.response);
            throw error;
        } else {
            // Change status to SENT
            await dynamo.updateTable(ddb, ddbQueries.updateOrderStatus(paymentId, constants.SENT));
            // Assign driver
            const availableDrivers = await dynamo.scanTable(ddb, ddbQueries.scanAvailableDrivers());
            if(availableDrivers.Items.length > 0) {
                const driver_id = availableDrivers.Items[0].driver_id;
                console.log(`Driver ${driver_id} is assigned to the order ${paymentId}`);
                await dynamo.updateTable(ddb, ddbQueries.updateStatusforDriver(driver_id, false));
                await dynamo.updateTable(ddb, ddbQueries.updateOrderforDriver(paymentId, driver_id));
            } else {
                console.log(`No driver is available for order_id ${paymentId}`);
            }
            // TODO redirect to order status page
            // TODO check phone notifications
            try {
                client.messages
                .create({
                    from: 'whatsapp:+14155238886',
                    body: "Thanku for choosing us, Your Order is Confirmed",
                    to: 'whatsapp:+18484371960'
                })
                .then((message) => {
                    console.log("message.status", message.status);
                    //res.status(200).send(message.status);
                })
                .done();
                res.json({ message: 'Successfully checkout out and added order summary: ' });
            } catch (err) {
                console.error(err);
                res.status(500).json({ err: 'Something went wrong', error: err });
            }
        }
    });
});

router.get('/orderPayment/cancel', async (req, res) => {
    const paymentId = req.query.paymentId;
    // Delete Order Summary
    await dynamo.deleteInTable(ddb, ddbQueries.deleteOrderSummary(paymentId));
    // Delete Order Items
    await dynamo.deleteItems(documentClient, constants.ORDER_ITEMS_TABLE_NAME, constants.ORDER_ID, paymentId);
    res.send('Cancelled')
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

router.get('/orderFees', async function (req, res, next) {
    res.json({ taxes: 0.14, surge_fees: 3});
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

router.get('/previousOrders', async function (req, res, next) {
    //const { customer_id } = req.params.rID
    //const previous_orders = await dynamo.queryTable(ddb, ddbQueries.queryPreviousOrdersForCustomer(customer_id));
    res.render('customer/previous-orders', {user_type: user_type});
});

router.post('/previousOrders', async function (req, res, next) {
    const { customer_id } = req.body
    const previous_orders = await dynamo.queryTable(ddb, ddbQueries.queryPreviousOrdersForCustomer(customer_id));
    res.json(previous_orders.Items);
});

router.post('/updateCustomer', async function (req, res, next) {
    console.log(req);
    const { user_id,address } = req.body
    console.log(user_id,address);
    var col_name=constants.ADDRESS;
    const update_address = await dynamo.updateTable(ddb, ddbQueries.updateEncryptedDataTable(user_id,col_name,address));
    res.json(update_address.Items);
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