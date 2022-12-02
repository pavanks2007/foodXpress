const { response } = require('express');
const express = require('express');
const { appendFile } = require('fs');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');
const axios = require('axios');
const xmlbuilder2=require('xmlbuilder2');

const ddb = dynamo.getDynamoDbClient();

loggedIn = false;
var userType = '';

/* GET home page. */
router.get('/', function (req, res) {

    if (!loggedIn) {
        res.redirect('dashboard')
    }
    else {
        res.redirect(userType)
    }

});
router.get('/dashboard', function (req, res) 
{
    res.render('general/landingPage.ejs', { root: path.join(__dirname, '..', 'views') });
})


router.get('/login', function (req, res) {

    try
    {
        res.render('general/generalLogin.ejs', { root: path.join(__dirname, '..', 'views') });
    }
    catch(err)
    {
        console.log("There is an error "+err)
    }
})

router.post('/login', async function (req, res) {
    const user_id = req.body.user_id
    const password = req.body.password
    //userType=req.body.userType

    try {
        const credentials = await dynamo.getFromTable(ddb, ddbQueries.getUserCredentials(user_id))
        const userInfo = await dynamo.getFromTable(ddb, ddbQueries.getUserDetails(user_id))
        userType=userInfo.Item[constants.USER_TYPE]
        if (password == credentials.Item[constants.ENCRYPTED_CREDENTIAL]) {
            console.log("User successfully logged in.")
            loggedIn = true;
            res.redirect('/' + userType)
        }
        else {
            console.log('Wrong Password')
            res.redirect('login')
        }
    } catch (err) {
        console.log(err)
        console.log('Wrong User Name or User does not exist.')
        res.redirect('login')
    }
})

router.get('/logout', function (req, res) {
    loggedIn = false;
    res.redirect('/');
    console.log('User Successfully logged Out')
})

router.get('/register', function (req, res) {
    res.render('general/register.ejs', { root: path.join(__dirname, '..', 'views') });
})

router.get('/add_updateAddress',function(req,res)
{
    res.render('general/addAddress.ejs', { root: path.join(__dirname, '..', 'views') });
})

router.post('/validateAddress', async function(req,res)
{
        const {addi, city,state} = req.body;
        const xaddipt2= req.body.xaddipt2;
    
        const root =xmlbuilder2.create({ version: '1.0' })
        .ele('AddressValidateRequest', { USERID: '159NONE00041' })
          .ele('Address')
            .ele('Address1').txt(addi).up()
            .ele('Address2').txt(xaddipt2).up()
            .ele('City').txt(city).up()
            .ele('State').txt(state).up()
            .ele('Zip5').up()
            .ele('Zip4').up()
            .up()
        .up();
        try{
            let xml= root.end({prettyPrint: true});
            console.log(xml)

            var ans;
            
            let url='https://secure.shippingapis.com/ShippingAPI.dll?API=Verify&xml='+ encodeURIComponent(xml);

             axios.get(url)
             .then(function(response){
                const obj= xmlbuilder2.convert(response.data,{format:"object"})
                console.log(obj);
             })
             .catch(function(err){
                console.log(err);
                res.redirect('/add_updateAddress');

             });
        }
        catch(error)
        {
            console.log(error)
        }

        res.redirect('/dashboard');
})

router.post('/addUser', async function (req, res) {
    
    const {user_id,user_name, email,password, conf} = req.body;
    const createdAt = new Date().toString();
    const user_type = 'customer'; //need to sync user type button.
    const address=''; //not sure how we handling this. 
    // Validation
    req.checkBody('user_name', 'Name is required').notEmpty();
    req.checkBody('email', 'Email is required').notEmpty();
    req.checkBody('email', 'Email is not valid').isEmail();
    req.checkBody('password', 'Password is required').notEmpty();
    req.checkBody('conf', 'Passwords do not match').equals(password);
    try 
    {

        res.redirect('/add_updateAddress')
        const newCustomer = await dynamo.putInTable(ddb, ddbQueries.putCustomer(user_id, user_name, email, user_type, createdAt, address, password));
        console.log('Successfully added user: '+ user_id)
        res.redirect('/dashboard')
    } catch (err) {
        
        console.log('there is an error: '+err )
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
router.get('/contact-us', function (req, res) {
    res.sendFile('general/contact-us-page.html', { root: path.join(__dirname, '..', 'views') });
})

module.exports = router;