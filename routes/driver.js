const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');

const ddb = dynamo.getDynamoDbClient();

router.get('/dashboard', function (req, res, next) {
    // TODO dashboard page
    res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
});

router.post('/dashboard', async function (req, res, next) {
    
});

router.get('/orders', function (req, res, next) {
    res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
});

router.post('/previousOrders', async function (req, res, next) {
    const { driver_id } = req.body
    const previous_orders = await dynamo.queryTable(ddb, ddbQueries.queryPreviousOrdersForDriver(driver_id));
    res.json(previous_orders.Items);
});

router.post('/order', async function (req, res, next) {
    const { driver_id, order_id } = req.body;
    const order_summary = await dynamo.getFromTable(ddb, ddbQueries.getOrderSummaryForDriver(order_id));
    if (!order_summary.Item.hasOwnProperty(constants.DRIVER_ID)) 
        throw `No driver assigned to order ${order_id}`;
    if (driver_id != order_summary.Item[constants.DRIVER_ID])
        throw `Order ${order_id} is not assigned to driver ${driver_id}`;
    const order_items = await dynamo.queryTable(ddb, ddbQueries.queryOrderItems(order_id));
    res.json({ order_summary: order_summary.Item, order_items: order_items.Item });
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
    const checkout = await dynamo.updateTable(ddb, ddbQueries.updatestatusforDriver(driver_id, Available, status));
    res.json({ message: 'Successfully updated order withnew driver: ' + checkout });
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
    }
    });

module.exports = router;

module.exports = router;
