const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');
const user_type = constants.MANAGER;

const ddb = dynamo.getDynamoDbClient();

/* GET home page. */
router.get('/', async function (req, res) {
    res.redirect(`/manager/dashboard`)
});

router.get('/dashboard', async function (req, res) {
    res.render("manager/dashboard", {user_type: user_type});
});

router.get('/previousOrders', async (req, res) => {
    try {
        const restaurant_id = req.signedCookies[constants.USER_ID];
        const orders = await dynamo.queryTable(ddb, ddbQueries.queryPreviousOrdersForRestaurant(restaurant_id));
        res.render('customer/previous-orders', {orders: orders.Items, user_type: user_type});
    } catch (error) {
        console.error(err);
        res.status(500).json({ err: 'Something went wrong', error: err });
    }
});

router.get('/orders/:orderId', async (req, res) => {
    try {
        const order_id = req.params.orderId;
        const restaurant_id = req.signedCookies[constants.USER_ID];
        const order_summary = await dynamo.getFromTable(ddb, ddbQueries.getOrderSummaryForCustomer(order_id));
        if (Object.keys(order_summary).length == 0) 
            throw `Order ${order_id} does not exist`;
        if (!order_summary.Item.hasOwnProperty(constants.RESTAURANT_ID)) 
            throw `No restaurant is assigned to order ${order_id}`;
        if (restaurant_id != order_summary.Item[constants.RESTAURANT_ID])
            throw `Order ${order_id} is not sent to the restaurant ${restaurant_id}`;
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
        res.redirect('/manager/previousOrders');
    }
});

router.get('/viewMenu',async function(req,res) {
    const restaurantID=req.signedCookies.user_id;
    try {
        const viewMenu= await dynamo.queryTable(ddb, ddbQueries.queryMenuItemsInRestaurant(restaurantID))
        console.log(viewMenu.Items)
        //res.json({message:'Successfully pulled Menu', data: viewMenu.Items})

        res.render("manager/viewMenu",{menu:viewMenu.Items, user_type: user_type})
    } catch(err) {
        console.log(err)
        res.send('Unable to pull Menu')
    }
})

router.post('/addMenuItem', async function(req,res,next) {
    const {item_id, item_name, item_price, description} = req.body
    try {
        const addMenuItemQuery = ddbQueries.putMenuItemInRestaurant(req.signedCookies.user_id, item_id, item_name, item_price, description);
        const addMenuItem = await dynamo.putInTable(ddb, addMenuItemQuery);
        res.json({message:'Successfully put menu item', query: addMenuItemQuery, queryResult: addMenuItem})
    } catch(err) {
        console.log(err)
        res.send({message:'Unable to add menu item', error: err})
    }
});

router.post('/deleteMenuItem', async function(req,res,next) {
    if(req.signedCookies.user_type !== 'manager')
    {
        res.redirect('/'+req.signedCookies['user_type']);
    }
    else{
        const item_id = req.body
        try {
            const deleteMenuQuery = ddbQueries.deleteMenuItem(req.signedCookies.user_id, item_id);
            const deleteMenuItem = await dynamo.deleteInTable(ddb, deleteMenuQuery);
            res.json({message:'Successfully deleted menu item', query: deleteMenuQuery, queryResult: deleteMenuItem})
        } catch(err) {
            console.log(err)
            res.send({message:'Unable to delete menu item', error: err})
        }
    }   
}); 

router.post('/updateRestaurantDetail', async function(req,res,next) {
    if(req.signedCookies.user_type !== 'manager')
    {
        res.redirect('/'+req.signedCookies['user_type']);
    }
    else{
        const {key, value} = req.body
        try {
            const updateRestaurantDetailQuery = ddbQueries.updateRestaurantDetail(req.signedCookies.user_id, key, value);
            const updateRestaurantDetail = await dynamo.updateTable(ddb, updateRestaurantDetailQuery);
            res.json({message:'Successfully updated restaurant detail', query: updateRestaurantDetailQuery, queryResult: updateRestaurantDetail})
        } catch(err) {
            console.log(err)
            res.send({message:'Unable to update restaurant detail', error: err})
        }
    }
});

router.get('/viewCoupons', async function(req,res,next) {
    if(req.signedCookies.user_type !== 'manager')
    {
        res.redirect('/'+req.signedCookies['user_type']);
    }
    else{
        try {
            const viewCouponsQuery = ddbQueries.queryCouponsForRestaurant(req.signedCookies.user_id);
            const viewCoupons = await dynamo.queryTable(ddb, viewCouponsQuery);
            
            console.log(viewCoupons.Items)
            res.render("manager/viewCoupons",{coupons:viewCoupons.Items, user_type: user_type})
        } catch(err) {
            console.log(err)
            res.send({message:'Unable to retrieve coupons', error: err})
        }
    }
});

router.post('/addCoupon', async function(req,res,next) {
    if(req.signedCookies.user_type !== 'manager')
    {
        res.redirect('/'+req.signedCookies['user_type']);
    }
    else{
         const {coupon_id, coupon_value, expiration_time} = req.body
        try 
        {
            const addCouponQuery = ddbQueries.putCoupon(req.signedCookies.user_id, coupon_id, coupon_value, true, expiration_time);
            const addCoupon = await dynamo.putInTable(ddb, addCouponQuery);
            res.json({message:'Successfully put coupon', query: addCouponQuery, queryResult: addCoupon})
        } 
        catch(err) 
        {
            console.log(err)
            res.send({message:'Unable to add coupon', error: err})
        }

    }
});

router.post('/deleteCoupon', async function(req,res,next) {
    if(req.signedCookies.user_type !== 'manager')
    {
        res.redirect('/'+req.signedCookies['user_type']);
    }
    else{

        const coupon_id = req.body
        try {
            const deleteCouponQuery = ddbQueries.deleteCoupon(req.signedCookies.user_id, coupon_id);
            const deleteCoupon = await dynamo.deleteInTable(ddb, deleteCouponQuery);
            res.json({message:'Successfully deleted coupon', query: deleteCouponQuery, queryResult: deleteCoupon})
        } catch(err) {
            console.log(err)
            res.send({message:'Unable to delete coupon', error: err})
        }

    }
});

module.exports = router;