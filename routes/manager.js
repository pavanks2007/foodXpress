const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');

const ddb = dynamo.getDynamoDbClient();

var loggedin=false;

const restaurantID=""
//requires view engine. Using ejs

/* GET home page. */
router.get('/', (req, res) =>
{
    /* This will check if manager is logged in
       If Manager is not logged i, redirect to log in page
       else redirect to manager dashboard*/
    if(!loggedin)
    {
        res.redirect('manager/login')
    }
    else
    {
        res.redirect('manager/dashboard')
    }

});

router.get('/login',(req,res)=>
{
    res.render("manager/login");
})

router.post('/login',async function(req,res)
{
    const user_id= req.body.user_id
    const password=req.body.password
    try
    {
        const userNameData= await dynamo.getFromTable(ddb,ddbQueries.getUserCredentials(user_id))
        const userType=await dynamo.getFromTable(ddb,ddbQueries.getUserDetails(user_id))
        
            if(password==userNameData.Item[constants.ENCRYPTED_CREDENTIAL])
            {
                if("manager"==userType.Item[constants.USER_TYPE])
                {
                    console.log("User successfully logged in.")
                    loggedin=true;
                    res.redirect('/manager') 
                }
                else
                {
                    console.log('Wrong User Type')
                    res.redirect('/manager')
                }
            }
            else
            {
                console.log('Wrong Password')
                res.redirect('/manager')
            }
    }
    
    catch(err)
    {
        console.log(err)
        console.log('Wrong User Name or User does not exist.')
        res.redirect('/manager')
    }
}) 

router.get('/logout',  function (req, res)  
{
    loggedin = false;
    res.redirect('/manager');
    console.log('User Successfully logged Out')
})


router.get('/dashboard',function (req, res)
{
    
    //const storeInfo= await dynamo.get
    
    res.render("manager/restaurant-manager-dashboard")


})

//retreave all prev orders from database and send it over to webpage.
router.get('/allOrders',async function(req,res)
{
    try
    {
        const allPrevOrders= await dynamo.queryTable(ddb, ddbQueries.queryPreviousOrdersForRestaurant(restaurantID));
        console.log('Successfully pulled data')
        res.render("manager/viewOrders",{allPrevOrders:allPrevOrders.Items})
    }
    catch(err)
    {
        console.log(err)
        res.send('Unable to pull data.')
    }
})

router.get('/orders/confirm',(req,res)=>
{
    res.render("manager/restaurant-manager-active-prev-orders")
})

router.get('/viewMenu/:rID',async function(req,res)
{
    const restaurantID=req.params.rID;
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
})

router.post('/addMenuItem', async function(req,res,next){
  const {restaurant_id, item_id, item_name, item_price, description} = req.body
  try {
      const addMenuItemQuery = ddbQueries.putMenuItemInRestaurant(restaurant_id, item_id, item_name, item_price, description);
      const addMenuItem = await dynamo.putInTable(ddb, addMenuItemQuery);
      res.json({message:'Successfully put menu item', query: addMenuItemQuery, queryResult: addMenuItem})
  } catch(err) {
      console.log(err)
      res.send({message:'Unable to add menu item', error: err})
  }
});

router.post('/deleteMenuItem', async function(req,res,next){
  const {restaurant_id, item_id} = req.body
  try {
      const deleteMenuQuery = ddbQueries.deleteMenuItem(restaurant_id, item_id);
      const deleteMenuItem = await dynamo.deleteInTable(ddb, deleteMenuQuery);
      res.json({message:'Successfully deleted menu item', query: deleteMenuQuery, queryResult: deleteMenuItem})
  } catch(err) {
      console.log(err)
      res.send({message:'Unable to delete menu item', error: err})
  }
}); 

router.post('/updateRestaurantDetail', async function(req,res,next){
    const {restaurant_id, key, value} = req.body
    try {
        const updateRestaurantDetailQuery = ddbQueries.updateRestaurantDetail(restaurant_id, key, value);
        const updateRestaurantDetail = await dynamo.updateTable(ddb, updateRestaurantDetailQuery);
        res.json({message:'Successfully updated restaurant detail', query: updateRestaurantDetailQuery, queryResult: updateRestaurantDetail})
    } catch(err) {
        console.log(err)
        res.send({message:'Unable to update restaurant detail', error: err})
    }
});

router.get('/viewCoupons/:rID', async function(req,res,next){
    const restaurant_id = req.params.rID;
    try {
        const viewCouponsQuery = ddbQueries.queryCouponsForRestaurant(restaurant_id);
        const viewCoupons = await dynamo.queryTable(ddb, viewCouponsQuery);
        
        console.log(viewCoupons.Items)
        res.render("manager/viewCoupons",{coupons:viewCoupons.Items})
    } catch(err) {
        console.log(err)
        res.send({message:'Unable to retrieve coupons', error: err})
    }
});

router.post('/addCoupon', async function(req,res,next)
{
    const {restaurant_id, coupon_id, coupon_value, expiration_time} = req.body
    try 
    {
        const addCouponQuery = ddbQueries.putCoupon(restaurant_id, coupon_id, coupon_value, true, expiration_time);
        const addCoupon = await dynamo.putInTable(ddb, addCouponQuery);
        res.json({message:'Successfully put coupon', query: addCouponQuery, queryResult: addCoupon})
    } 
    catch(err) 
    {
        console.log(err)
        res.send({message:'Unable to add coupon', error: err})
    }
});

router.post('/deleteCoupon', async function(req,res,next){
    const {restaurant_id, coupon_id} = req.body
    try {
        const deleteCouponQuery = ddbQueries.deleteCoupon(restaurant_id, coupon_id);
        const deleteCoupon = await dynamo.deleteInTable(ddb, deleteCouponQuery);
        res.json({message:'Successfully deleted coupon', query: deleteCouponQuery, queryResult: deleteCoupon})
    } catch(err) {
        console.log(err)
        res.send({message:'Unable to delete coupon', error: err})
    }
});
module.exports = router;