const { response } = require('express');
const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');
const ddb = dynamo.getDynamoDbClient();
const user_type = "";

/* GET home page. */
router.get('/', async function (req, res) {
    if (req.signedCookies[constants.USER_ID] !== undefined && req.signedCookies[constants.USER_TYPE] !== undefined)
        res.redirect(`/${req.signedCookies[constants.USER_TYPE]}/`)
    else 
        res.redirect(`/restaurants`)
});

router.get('/restaurants', async function (req, res, next) {
    try {
        const restaurants = await dynamo.queryTable(ddb, ddbQueries.queryListOfRestaurants());
        restaurants.Items.forEach(function(restaurant) {
            restaurant[constants.RESTAURANT_ID] = restaurant[constants.SORT_KEY];
            if(!restaurant.hasOwnProperty(constants.RATING))
                restaurant[constants.RATING] = constants.DEFAULT_RATING;
            delete restaurant[constants.SORT_KEY];
        });
        allRestaurants = restaurants.Items;
        featuredRestaurants = allRestaurants.sort((a,b) => b.rating - a.rating).slice(0, constants.DEFAULT_NUMBER_OF_FEATURED_RESTAURANTS);
        res.render("general/restaurants", { featuredRestaurants: featuredRestaurants, allRestaurants:allRestaurants, user_type: user_type} );
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

router.route("/login").get(function (req, res) {
    if (req.signedCookies[constants.USER_ID] !== undefined && req.signedCookies[constants.USER_TYPE] !== undefined)
        res.redirect(`/${req.signedCookies[constants.USER_TYPE]}/`)
    else {
        let error = Object.keys(req.query).length !== 0 && req.query.hasOwnProperty("error") ? req.query.error : "";
        res.render('general/login', {user_type: user_type, error: error} );
    }
});

router.route("/login").post(async function (req, res) {
    try {
        const {user_id, password, user_type} = req.body
        const userInfo = await dynamo.getFromTable(ddb, ddbQueries.getUserCredentials(user_id));
        if(Object.keys(userInfo).length === 0)
            throw `User does not exist; provided user_id: ${user_id}`
        else {    
            if (!userInfo.Item[constants.USER_ID]) 
            throw `User does not exist; provided user_id: ${user_id}`
            if (user_type != userInfo.Item[constants.USER_TYPE])
            throw `Usertype does not match; provided user_id: ${user_type}`
            if (password != userInfo.Item[constants.ENCRYPTED_CREDENTIAL]) 
            throw `Password does not match`
            console.log(`${user_type} ${user_id} successfully logged in.`);
            res.cookie('user_id', user_id, { signed: true });
            res.cookie('user_type', user_type, { signed: true });
            res.redirect('/'+user_type+'/');
        }
    } catch (err) {
        console.log(err);
        res.redirect('/login?error=' + encodeURIComponent(err));
    }
})

router.get('/logout', function (req, res) {
    res.clearCookie('user_id');
    res.clearCookie('user_type');
    console.log('User Successfully logged Out');
    res.redirect('/');
})

router.get('/register', function (req, res) {
    if (req.signedCookies[constants.USER_ID] !== undefined && req.signedCookies[constants.USER_TYPE] !== undefined)
        res.redirect(`/${req.signedCookies[constants.USER_TYPE]}/`)
    else {
        let error = Object.keys(req.query).length !== 0 && req.query.hasOwnProperty("error") ? req.query.error : "";
        res.render('general/register', {user_type: user_type, error: error} );
    }
})

router.post('/registerUser', async function(req,res) {
    try {
        const {user_id,user_name, email,password,confirmedPassword, user_type} = req.body;
        const user_type_lower = user_type.toLowerCase();
        console.log(password, confirmedPassword);
        if (confirmedPassword != password )
            throw `Passwords are not matching`
        let createdAt = new Date().toString();
        const userNameData= await dynamo.getFromTable(ddb,ddbQueries.getUserCredentials(user_id))
        console.log(userNameData);
        if(Object.keys(userNameData).length==0) {
            const newCustomer = await dynamo.putInTable(ddb, ddbQueries.putCustomer(user_id, user_name, email, user_type_lower, createdAt,'', '','',password));
            console.log('Successfully added user: '+ user_id)
            res.cookie('user_id', user_id, { signed: true });
            res.cookie('user_type', user_type_lower, { signed: true });
            res.redirect('customer/updateAddress/')
        }
        else {
            throw `User ${user_id} already exists`
        }   
    } catch(err) {
        res.redirect('/register?error=' + encodeURIComponent(err));
    }
})

router.get('/support', function (req, res) {
    if (req.signedCookies[constants.USER_TYPE] === undefined) 
        res.render('general/contact-us-page', {user_type: user_type});
    else
        res.render('general/contact-us-page', {user_type: req.signedCookies[constants.USER_TYPE]});
});

module.exports = router;