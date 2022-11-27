const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');

const ddb = dynamo.getDynamoDbClient();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
});

router.get('/login',(req,res)=>{
  res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
})

/*Takes in username and password*/
router.post('/login',(req,res) => {
    //get user, send user to database, 
    var user_name= req.body.user_name
    console.log(user_name)
    const exists=0; //exist=0 means does not exist
   //username not found
   if(exists==0)
   {
    return res.send('User does not exist!Try again.')
   }
  //if database has user, check if password matches.
    var password = req.body.password;
    const match=0;

    if(match==0)
    {
        return res.send('Password is incorrect!Try again')
    }

    res.send('Log in successful')
    res.send('success').redirect('/')
})


router.post('/dashboard',(req,res)=>
{
    //do later
})

router.get('/orders',(req,res)=>
{
    res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
})
//retreave all prev orders from database and send it over to webpage.
router.post('/orders'),async function(req,res)
{
    const restaurantID="";
    try
    {
        const allPrevOrders= await dynamo.queryTable(ddb, ddbQueries.queryPreviousOrdersForRestaurant(restaurantID));
        console.log('Successfully pulled data')
        res.json(allPrevOrders.Items);
    }
    catch(err)
    {
        console.log(err)
        res.send('Unable to pull data.')
    }
}

router.post('orders/confirm',(req,res)=>
{
    //not sure how to handle this
})

//This will load page where restaurant menu will show up.
router.get('/menu',(req,res)=>
{
    res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
})

//Here we will pull the menu data and send it to frontend. 
router.post('/menu2'),async function(req,res)
{
  const {restaurant_id, item_id, description, item_name, item_price} = req.body
  console.log(restaurant_id, item_id, description, item_name, item_price)
    try
    {
        const viewMenu= await dynamo.putInTable(ddb, ddbQueries.putMenu(restaurant_id, item_id, description, item_name, item_price))
        console.log(viewMenu.Items)
        res.json({message:'Successfully pulled Menu', data: viewMenu.Items})
    }
    catch(err)
    {
        console.log(err)
        res.send('Unable to pull Menu')
    }
}

//Here we will update an item in the Menu
router.post('/menu'), async function(req,res)
{
    //need help
}

router.get('/logout',  function (req, res)  
{
    // If the user is loggedin
    if (req.session.loggedin) {
          req.session.loggedin = false;
          res.redirect('/');
    } else {
        // Not logged in
        res.redirect('/');
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

router.post('/addCoupon', async function(req,res,next){
const {restaurant_id, coupon_id, coupon_value, expiration_time} = req.body
try {
    const addCouponQuery = ddbQueries.putCoupon(restaurant_id, coupon_id, coupon_value, true, expiration_time);
    const addCoupon = await dynamo.putInTable(ddb, addCouponQuery);
    res.json({message:'Successfully put coupon', query: addCouponQuery, queryResult: addCoupon})
} catch(err) {
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

router.post('/viewCoupons', async function(req,res,next){
    const {restaurant_id} = req.body
    try {
        const viewCouponsQuery = ddbQueries.queryCouponsForRestaurant(restaurant_id);
        const viewCoupons = await dynamo.queryTable(ddb, viewCouponsQuery);
        res.json(viewCoupons.Items)
    } catch(err) {
        console.log(err)
        res.send({message:'Unable to retrieve coupons', error: err})
    }
});

module.exports = router;