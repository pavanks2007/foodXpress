const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');

const ddb = dynamo.getDynamoDbClient();

loggedIn = false;
var userType = '';

/* GET home page. */
router.get('/', (req, res) => {

    if (!loggedIn) {
        res.redirect('login')
    }
    else {
        res.redirect(userType)
    }

});

router.get('/login', (req, res) => {
    res.render('general/generalLogin.ejs', { root: path.join(__dirname, '..', 'views') });
})

router.post('/login', async function (req, res) {
    const user_id = req.body.user_id
    const password = req.body.password
    try {
        const credentials = await dynamo.getFromTable(ddb, ddbQueries.getUserCredentials(user_id))
        const userInfo = await dynamo.getFromTable(ddb, ddbQueries.getUserDetails(user_id))
        userType = userInfo.Item[constants.USER_TYPE]

        if (password == credentials.Item[constants.ENCRYPTED_CREDENTIAL]) {
            console.log("User successfully logged in.")
            loggedIn = true;
            res.redirect('/' + userType + '/dashboard')
        }
        else {
            console.log('Wrong Password')
            res.redirect('/')
        }
    }

    catch (err) {
        console.log(err)
        console.log('Wrong User Name or User does not exist.')
        res.redirect('/')
    }
})

router.get('/logout', function (req, res) {
    loggedIn = false;
    res.redirect('/');
    console.log('User Successfully logged Out')
})

router.get('/register', (req, res) => {

    res.sendFile('register.html', { root: path.join(__dirname, '..', 'views') });

})


router.post('/addUser', async function (req, res, next) {
    const { user_id, user_name, email, user_type, address } = req.body;
    const createdAt = new Date().toString();
    const encryptedCredential = "Rutgers@123";
    try {
        const newCustomer = await dynamo.putInTable(ddb, ddbQueries.putCustomer(user_id, user_name, email, user_type, createdAt, address, encryptedCredential));
        res.json({ message: 'Successfully added user: ' + user_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err });
    }
});

/* GET home page. */
// router.get('/', function (req, res, next) {
//     try {
//         // res.redirect('/restaurants');
//         res.sendFile('index.html', { root: path.join(__dirname, '..', 'views') });
//     } catch (err) {
//         console.log(err);
//         res.send({ message: 'Unable to render route /', error: err });
//     }
// });

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

router.get('/contact-us', (req, res) => {
    res.sendFile('general/contact-us-page.html', { root: path.join(__dirname, '..', 'views') });
})

module.exports = router;