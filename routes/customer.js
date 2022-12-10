const express = require('express');
const path = require('path');
const router = express.Router();
var expressValidator = require('express-validator');
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');
const fs = require('fs');
const paypal = require('paypal-rest-sdk');
const axios = require('axios');
const xmlbuilder2=require('xmlbuilder2');
const user_type = constants.CUSTOMER;

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'AaMQhQJJ9rbV2fBrTSiYLMEhZMx4Dxq26JGawovRBbRW24dMLtJ7_171Zy78QAO3mjjCNIh85eIziQNn',
    'client_secret': 'EMfiAVH-mVnTRGctW029hm3rrOpO7AVaXyI4790ZvwJrbslZ0T2OyFq5ZlhCbfBI0i4Vak7o4zK0NxTF'
});

const accountSid = 'AC24363df7efae2d43927f757719479774';
const authToken = '96c27a579a543c695a4ff2b2b74abc88';
const client = require("twilio")(accountSid, authToken);

const ddb = dynamo.getDynamoDbClient();

router.get('/', function(req,res) {
    res.redirect('/customer/restaurants')
})

/* GET home page. */
router.get('/dashboard', async function (req, res, next) {
    // res.render('customer/dashboard', {user_type: user_type});
    res.redirect('/customer/');
})

router.get('/restaurants', async function (req, res, next) {
    try {
        const customer_id = req.signedCookies.user_id;
        const customerDetails = await dynamo.getFromTable(ddb, ddbQueries.getUserDetails(customer_id));
        const restaurants = await dynamo.queryTable(ddb, ddbQueries.queryListOfRestaurants());
        restaurants.Items.forEach(function(restaurant) {
            if (restaurant.hasOwnProperty(constants.LATITUDE) && restaurant.hasOwnProperty(constants.LONGITUDE) && customerDetails.Item.hasOwnProperty(constants.LATITUDE) && customerDetails.Item.hasOwnProperty(constants.LONGITUDE)) {
                restaurant[constants.DISTANCE] = parseFloat(getDistanceInMiles(restaurant[constants.LATITUDE], restaurant[constants.LONGITUDE],customerDetails.Item[constants.LATITUDE],customerDetails.Item[constants.LONGITUDE])).toFixed(4);
            } else {
                restaurant[constants.DISTANCE] = parseFloat("15").toFixed(2);
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
        const cartLimits = {
            "cart_min": 15,
            "cart_max": 150,
            "cart_tax": 0.09,
            "cart_surge": 2
        };
        console.log(cartLimits);
        res.render('general/view-menu', {restaurantDetails: restaurantDetails.Item, items: menuItems.Items, cartLimits:cartLimits, user_type: user_type});
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
    const {restaurant_id, restaurant_name, items_price, taxes, surge_fee, total_tip, coupon_used, coupon_value, final_price, mode, items} = req.body;
    console.log("items", items);
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
            await dynamo.putInTable(ddb, ddbQueries.putOrderSummary(order_id, customer_id, restaurant_id, restaurant_name, items_price, taxes, surge_fee, total_tip, coupon_used, coupon_value, final_price, mode, createdAt, constants.PROCESSING));
            items.forEach(async function(item) {
                // Add order items
                await dynamo.putInTable(ddb, ddbQueries.putItemInOrders(restaurant_id, restaurant_name, order_id, item["item_id"], item["item_name"], item["item_price"], item["quantity"]));
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
            await dynamo.updateTable(ddb, ddbQueries.updateOrderStatus(paymentId, constants.ORDER_PLACED));
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
                    body: `Thank you for ordering from ${orderSummary[constants.RESTAURANT_NAME]}. Your order is confirmed, we will be in touch shortly.`,
                    to: 'whatsapp:+18484371960'
                })
                .then((message) => {
                    console.log("message.status", message.status);
                    //res.status(200).send(message.status);
                })
                .done();
                res.redirect('/customer/orders/'+paymentId);
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

router.get('/previousOrders', async (req, res) => {
    try {
        const customer_id = req.signedCookies[constants.USER_ID];
        const orders = await dynamo.queryTable(ddb, ddbQueries.queryPreviousOrdersForCustomer(customer_id));
        res.render('customer/previous-orders', {orders: orders.Items.reverse(), user_type: user_type});
    } catch (error) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
    }
});

router.get('/orders/:orderId', async (req, res) => {
    try {
        const order_id = req.params.orderId;
        const customer_id = req.signedCookies[constants.USER_ID];
        const order_summary = await dynamo.getFromTable(ddb, ddbQueries.getOrderSummaryForCustomer(order_id));
        if (Object.keys(order_summary).length == 0) 
            throw `Order ${order_id} does not exist`;
        if (!order_summary.Item.hasOwnProperty(constants.USER_ID)) 
            throw `No customer assigned to order ${order_id}`;
        if (customer_id != order_summary.Item[constants.USER_ID])
            throw `Order ${order_id} is not ordered by customer ${customer_id}`;
        const order_items = await dynamo.queryTable(ddb, ddbQueries.queryOrderItems(order_id));
        const ids = [order_summary.Item[constants.USER_ID], order_summary.Item[constants.RESTAURANT_ID]];
        console.log("order_summary.Item", order_summary.Item);
        if (order_summary.Item.hasOwnProperty(constants.DRIVER_ID)) {
            ids.push(order_summary.Item[constants.DRIVER_ID]);
        }
        const batch_result = await dynamo.batchGetFromTable(ddb, ddbQueries.batchGetUserDetails(ids));
        console.log("batch_result", batch_result.Responses[constants.ENCRYPTED_DATA_TABLE_NAME]);
        res.render('customer/order-status-page', {order_summary: order_summary.Item, order_items: order_items.Items, batch_result:batch_result.Responses[constants.ENCRYPTED_DATA_TABLE_NAME], user_type: user_type});
    } catch(err) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
        res.redirect('/customer/previousOrders');
    }
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

router.get('/getUserDetails/:id', async function (req, res, next) {
    try {
        const users = await dynamo.getFromTable(ddb, ddbQueries.queryGetCustomer(id));
        res.json(users.Item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
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

router.get('/updateAddress',function(req,res) {
    let error = Object.keys(req.query).length !== 0 && req.query.hasOwnProperty("error") ? req.query.error : "";
    res.render('general/addAddress', {user_type: user_type, error: error} );
})

router.post('/updateAddress', async function (req, res) {
    const user_id= req.signedCookies.user_id;
    const{ addpt1,addpt2,city,state,zip}= req.body;
    var fulladd;
    let error = "";
    //_________________________________________________________________________________________
    /*here we will validate address*/
        
    try//this will try to execute ther address validator and update DB.
    {
        const root =xmlbuilder2.create({ version: '1.0' })
        .ele('AddressValidateRequest', { USERID: '159NONE00041' })
          .ele('Address')
            .ele('Address1').txt(addpt1).up()
            .ele('Address2').txt(addpt2).up()
            .ele('City').txt(city).up()
            .ele('State').txt(state).up()
            .ele('Zip5').txt(zip).up()
            .ele('Zip4').up()
            .up()
        .up();

        let xml= root.end({prettyPrint: true});
        let url='https://secure.shippingapis.com/ShippingAPI.dll?API=Verify&xml='+ encodeURIComponent(xml);

        axios.get(url)
        .then(async function(response) {  
            const obj= xmlbuilder2.convert(response.data,{format:"object"});
            console.log(obj.AddressValidateResponse);
            
            if(obj.AddressValidateResponse.Address.hasOwnProperty("Error")) {
                res.redirect('/customer/updateAddress?error=' + encodeURIComponent('Address does not exist. Please Try again.'));
            } else {
                delete obj["AddressValidateResponse"]["Address"]["Zip4"]//deletes extra zip code
                const fullAddress=Object.values(obj["AddressValidateResponse"]["Address"])
                fulladd=fullAddress.join()

                const updated= await dynamo.updateTable(ddb, ddbQueries.updateEncryptedDataTable(user_id,constants.ADDRESS,fulladd)); 
                console.log('successfully Added/Updated Users Address')
                try
                {
                    let url2=`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fulladd)}&key=AIzaSyCSCk3BE2UzEdCR0-NcWzmnD2dTCv3Jcsg`
                    fetch(url2)
                    .then(function(response){
                        console.log(response);
                        return response.json();
                    })
                    .then(async function(data) {
                        console.log(data);
                        coordinates=Object.values(data.results[0].geometry.location)
                        console.log(coordinates[0])
                        console.log(coordinates[1])

                        await dynamo.updateTable(ddb, ddbQueries.updateEncryptedDataTable(user_id,constants.LATITUDE,coordinates[0]));
                        await dynamo.updateTable(ddb, ddbQueries.updateEncryptedDataTable(user_id,constants.LONGITUDE,coordinates[1]));

                        console.log('Successfully added coordinates')
                        res.redirect('/')
                    })
                    .catch(function(err){
                        error = err;
                    })
                } catch(err) {
                    error = err;
                }
            }
        })
        .catch(function(err) {
            error = err;
        })
    } catch(err) {
        console.log(err)
    }
    if (error.length > 0){
        console.log(error);
        res.redirect('/customer/updateAddress?error=' + encodeURIComponent(err));
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