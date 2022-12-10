const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');
const user_type = constants.DRIVER;

const ddb = dynamo.getDynamoDbClient();

router.get('/', async function (req, res) {
    res.redirect(`/driver/dashboard`)
});

router.get('/dashboard', function (req, res, next) {
    // TODO dashboard page
    res.render('driver/dashboard', {user_type: user_type});
});

router.post('/dashboard', async function (req, res, next) {
    
});

router.get('/orders', function (req, res, next) {
    res.render('driver/active-orders', {user_type: user_type});
});

router.get('/previousOrders', async (req, res) => {
    try {
        const driver_id = req.signedCookies[constants.USER_ID];
        const orders = await dynamo.queryTable(ddb, ddbQueries.queryPreviousOrdersForDriver(driver_id));
        res.render('customer/previous-orders', {orders: orders.Items, user_type: user_type});
    } catch (error) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
    }
});

router.get('/orders/:orderId', async (req, res) => {
    try {
        const order_id = req.params.orderId;
        const driver_id = req.signedCookies[constants.USER_ID];
        const order_summary = await dynamo.getFromTable(ddb, ddbQueries.getOrderSummaryForDriver(order_id));
        if (Object.keys(order_summary).length == 0) 
            throw `Order ${order_id} does not exist`;
        if (!order_summary.Item.hasOwnProperty(constants.DRIVER_ID)) 
            throw `No restaurant is assigned to order ${order_id}`;
        if (driver_id != order_summary.Item[constants.DRIVER_ID])
            throw `Order ${order_id} is not assigned to the driver ${restaurant_id}`;
        const order_items = await dynamo.queryTable(ddb, ddbQueries.queryOrderItems(order_id));
        const ids = [order_summary.Item[constants.USER_ID], order_summary.Item[constants.RESTAURANT_ID]];
        if (order_summary.Item.hasOwnProperty(constants.DRIVER_ID)) {
            ids.push(order_summary.Item[constants.DRIVER_ID]);
        }
        const batch_result = await dynamo.batchGetFromTable(ddb, ddbQueries.batchGetUserDetails(ids));
        console.log("batch_result", batch_result.Responses[constants.ENCRYPTED_DATA_TABLE_NAME]);
        res.render('customer/order-status-page', {order_summary: order_summary.Item, order_items: order_items.Items, batch_result:batch_result.Responses[constants.ENCRYPTED_DATA_TABLE_NAME], user_type: user_type});
    } catch(err) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
        res.redirect('/driver/previousOrders');
    }
});

router.post('/updateOrderforDriver', async function (req, res, next) {
    const { driver_id, order_id } = req.body;
    const driver_id_list = await dynamo.scanTable(ddb, ddbQueries.scanAvailableDriver());
    let driver_id_updt = driver_id_list.Items[1].driver_id.toString();
    try {
        const checkout = await dynamo.updateTable(ddb, ddbQueries.updateOrderforDriver(order_id, driver_id.toString(), driver_id_updt  ));
        res.json({ message: 'Successfully updated order withnew driver: ' + checkout });
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
    }
});

router.post('/status', async function(req,res,next){
    const{driver_id,status} = req.body;
    try{                                                                   
    const checkout = await dynamo.updateTable(ddb, ddbQueries.updateStatusforDriver(driver_id, status));
    res.json({ message: 'Successfully updated order with new driver: ' + checkout });
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
    }
});

module.exports = router;

