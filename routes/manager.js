const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');

const ddb = dynamo.getDynamoDbClient();

/* GET home page. */
router.get('/', async function (req, res) {
    res.redirect(`/manager/dashboard`)
});

router.get('/dashboard', async function (req, res) {
    if(req.signedCookies.user_type !== 'manager')
    {
        res.redirect('/'+req.signedCookies['user_type']);
    }
    else
    {
        //const storeInfo= await dynamo.get
        res.render("manager/restaurant-manager-dashboard");
    }
});

//get all prev orders from database and send it over to webpage.
router.get('/allOrders', async function(req,res) {
    if(req.signedCookies.user_type !== 'manager')
    {
        res.redirect('/'+req.signedCookies['user_type']);
    }
    else{
        try{
            const allPrevOrders= await dynamo.queryTable(ddb, ddbQueries.queryPreviousOrdersForRestaurant(req.signedCookies.user_id));
            console.log('Successfully pulled data')
            res.render("manager/viewOrders",{allPrevOrders:allPrevOrders.Items})
        }
        catch(err)
        {
            console.log(err)
            res.send('Unable to pull data.')
        }
    }
})

router.get('/orders/confirm',(req,res)=> {
    if(req.signedCookies.user_type !== 'manager')
    {
        res.redirect('/'+req.signedCookies['user_type']);
    }
    else{
        res.render("manager/viewMenu.ejs")
    }
})

router.get('/viewMenu',async function(req,res) {
    if(req.signedCookies.user_type !== 'manager')
    {
        res.redirect('/'+req.signedCookies['user_type']);
    }
    else{
        const restaurantID=req.signedCookies.user_id;
        try
        {
            const viewMenu= await dynamo.queryTable(ddb, ddbQueries.queryMenuItemsInRestaurant(restaurantID))
            console.log(viewMenu.Items)
            //res.json({message:'Successfully pulled Menu', data: viewMenu.Items})

            res.render("manager/viewMenu",{menu:viewMenu.Items})
        }
        catch(err)
        {
            console.log(err)
            res.send('Unable to pull Menu')
        }
    }
})

router.post('/addMenuItem', async function(req,res,next) {
    if(req.signedCookies.user_type !== 'manager')
    {
        res.redirect('/'+req.signedCookies['user_type']);
    }
    else
    {
        const {item_id, item_name, item_price, description} = req.body
        try {
            const addMenuItemQuery = ddbQueries.putMenuItemInRestaurant(req.signedCookies.user_id, item_id, item_name, item_price, description);
            const addMenuItem = await dynamo.putInTable(ddb, addMenuItemQuery);
            res.json({message:'Successfully put menu item', query: addMenuItemQuery, queryResult: addMenuItem})
        } catch(err) {
            console.log(err)
            res.send({message:'Unable to add menu item', error: err})
        }
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
            res.render("manager/viewCoupons",{coupons:viewCoupons.Items})
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

function validateCookie(signedCookies) {
    try {
        return signedCookies && signedCookies[constants.USER_TYPE] == constants.MANAGER
    } catch (error) {
        return false
    }
}

module.exports = router;