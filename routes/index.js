const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');

const ddb = dynamo.getDynamoDbClient();

/* GET home page. */
router.get('/', function (req, res) {
    res.redirect('/restaurants');
});

router.get('/login', function (req, res) {
    res.render('generalLogin.ejs', { root: path.join(__dirname, '..', 'views', 'general') });
})

router.post('/login', async function (req, res) {
    try {
        console.log(req.signedCookies);
        console.log(req.body)
        const {user_id, password, user_type} = req.body
        const userInfo = await dynamo.getFromTable(ddb, ddbQueries.getUserCredentials(user_id));
        if (! userInfo.Item[constants.USER_ID]) 
            throw `User does not exist; provided ${user_id}`
        if (user_type != userInfo.Item[constants.USER_TYPE])
            throw `Usertype does not match; provided ${user_type}`
        if (password != userInfo.Item[constants.ENCRYPTED_CREDENTIAL]) 
            throw `Password does not match`
        console.log(`${user_type} ${user_id} successfully logged in.`);
        res.cookie('user_id', user_id, { signed: true });
        res.cookie('user_type', user_type, { signed: true });
        // res.send(`${user_type} ${user_id} successfully logged in.`);
        res.redirect('/restaurants');
    } catch (err) {
        console.log(err);
        res.redirect('/login'); // TODO: send error message
    }
})

router.get('/logout', function (req, res) {

    res.clearCookie('user_id');
    res.clearCookie('user_type');
    console.log('User Successfully logged Out');
    res.redirect('/');
})

router.get('/register', function (req, res) {
    res.sendFile('register.html', { root: path.join(__dirname, '..', 'views') });
});

router.post('/addUser', async function (req, res, next) {
    const { user_id, encryptedCredential, user_name, email, user_type, address } = req.body;
    const createdAt = new Date().toString();
    try {
        await dynamo.putInTable(ddb, ddbQueries.putCustomer(user_id, user_name, email, user_type, createdAt, address, encryptedCredential));
        res.json({ message: 'Successfully added user: ' + user_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err });
    }
});

router.get('/restaurants', async function (req, res, next) {
    try {
        const restaurants = await dynamo.queryTable(ddb, ddbQueries.queryListOfRestaurants());
        res.json(restaurants.Items);
    } catch (err) {
        console.log(err);
        res.send({ message: 'Unable to view restaurants', error: err });
    }
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

router.get('/contact-us', function (req, res) {
    res.sendFile('general/contact-us-page.html', { root: path.join(__dirname, '..', 'views') });
})

module.exports = router;