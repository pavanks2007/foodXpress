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
    try {
        const restaurants = await dynamo.queryTable(ddb, ddbQueries.queryListOfRestaurants());
        res.json(restaurants.Items);
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


router.post('/orders/checkout', async function (req, res, next) {
    const { order_id, customer_id, restaurant_id, total_price, taxes, surge_fee, total_tip, express_delivery, coupon_used } = req.body;
    const createdAt = new Date().toString();
    const driver_id = "";
    //const order_id=100;
    console.log(req);
    try {
        const checkout = await dynamo.putInTable(ddb, ddbQueries.putOrderSummary(order_id, restaurant_id, customer_id, driver_id, total_price, taxes, surge_fee, total_tip, express_delivery, coupon_used, createdAt));
        res.json({ message: 'Successfully checkout out and added order summary: ' + checkout });
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
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

router.post('/previous_orders', async function (req, res, next) {
    const { customer_id } = req.body
    const previous_orders = await dynamo.queryTable(ddb, ddbQueries.queryPreviousOrdersForCustomer(customer_id));
    res.json(previous_orders.Items);
});

router.get('/getUserDetails/:id', async function (req, res, next) {
    const user_id = req.params.id;
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

module.exports = router;