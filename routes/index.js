const { response } = require('express');
const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');
const axios = require('axios');
const xmlbuilder2=require('xmlbuilder2');
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
                restaurant[constants.RATING] = 3.8;
            delete restaurant[constants.SORT_KEY];
        });
        allRestaurants = restaurants.Items;
        featuredRestaurants = allRestaurants.sort((a,b) => b.rating - a.rating).slice(0, 6);
        res.render("general/restaurants", { featuredRestaurants: featuredRestaurants, allRestaurants:allRestaurants, user_type: user_type} );
    } catch (err) {
        console.log(err);
        res.send({ message: 'Unable to view restaurants', error: err });
    }
});

router.post('/restaurant/menu', async function (req, res, next) {
    // TODO
    try {
        const { restaurant_id } = req.body;
        const menuItems = await dynamo.queryTable(ddb, ddbQueries.queryMenuItemsInRestaurant(restaurant_id));
        res.json(menuItems.Items);
    } catch (err) {
        console.log(err);
        res.send({ message: 'Unable to view restaurant menu', error: err });
    }
});

router.route("/login").get(function (req, res) {
    if (req.signedCookies[constants.USER_ID] !== undefined && req.signedCookies[constants.USER_TYPE] !== undefined)
        res.redirect(`/${req.signedCookies[constants.USER_TYPE]}/`)
    else
        res.render('general/login', {user_type: user_type} );
});

router.route("/login").post(async function (req, res) {
    try {
        const {user_id, password, user_type} = req.body
        const userInfo = await dynamo.getFromTable(ddb, ddbQueries.getUserCredentials(user_id));

        if(userInfo.Item.length == 0)
            throw `User does not exist; provided ${user_id}`
        else {    
            if (!userInfo.Item[constants.USER_ID]) 
            throw `User does not exist; provided ${user_id}`
            if (user_type != userInfo.Item[constants.USER_TYPE])
            throw `Usertype does not match; provided ${user_type}`
            if (password != userInfo.Item[constants.ENCRYPTED_CREDENTIAL]) 
            throw `Password does not match`
            console.log(`${user_type} ${user_id} successfully logged in.`);
            res.cookie('user_id', user_id, { signed: true });
            res.cookie('user_type', user_type, { signed: true });
            res.redirect('/'+user_type+'/');
        }
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
    res.render('general/register', {user_type: user_type});
})

router.post('/addUser', async function(req,res)//checks if user exists. If info is valid, move on to the next phase of registration
{
    const {user_id,user_name, email,password,confirmPass, user_type} = req.body;
    let createdAt = new Date().toString();
    const userNameData= await dynamo.getFromTable(ddb,ddbQueries.getUserCredentials(user_id))
    console.log(userNameData);
    req.checkBody('confirmPass', 'Passwords do not match').equals(password);
    if(Object.keys(userNameData).length==0) {
        try{ 
            const newCustomer = await dynamo.putInTable(ddb, ddbQueries.putCustomer(user_id, user_name, email, user_type, createdAt,'', '','',password));
            console.log('Successfully added user: '+ user_id)
            res.redirect('/add_updateAddress/'+user_id)
        } 
        catch (err) {
            console.log('there is an error: '+err )
        }
        
    }
    else if(userNameData.Item.hasOwnProperty(constants.ENCRYPTED_CREDENTIAL)) {
        console.log('User Exists. Being redirected to Login page.')
        res.redirect('/login')
    }
    else {
        console.log('IDK missing something:')
    }
})

router.get('/add_updateAddress/:rID',function(req,res) {
    res.render("general/addAddress",{userID:req.params.rID, user_type: user_type});
})

router.post('/add_updateAddress/:rID', async function (req, res) {
    
    const user_id= req.params.rID;
    const{ addpt1,addpt2,city,state,zip}= req.body;
    var fulladd;
    //_________________________________________________________________________________________
    /*here we will validate address*/
        
    try//this will try to execute ther address validator and update DB.
    {
        const root =xmlbuilder2.create({ version: '1.0' })
        .ele('AddressValidateRequest', { USERID: '159NONE00041' })
          .ele('Address')
            .ele('Address1').txt(addpt1).up()
            .ele('Address2').txt(addpt2).up()
            .ele('City').txt(city).up()
            .ele('State').txt(state).up()
            .ele('Zip5').txt(zip).up()
            .ele('Zip4').up()
            .up()
        .up();

        let xml= root.end({prettyPrint: true});
        let url='https://secure.shippingapis.com/ShippingAPI.dll?API=Verify&xml='+ encodeURIComponent(xml);

        axios.get(url)
        .then(async function(response)
        {    
            const obj= xmlbuilder2.convert(response.data,{format:"object"});
            
            if(obj.AddressValidateResponse.Address.Error)
            {
                console.log('Address does not exist. Please Try again.')
                res.redirect('/add_updateAddress/'+user_id)
            }
            else
            {
                delete obj["AddressValidateResponse"]["Address"]["Zip4"]//deletes extra zip code
                const fullAddress=Object.values(obj["AddressValidateResponse"]["Address"])
                fulladd=fullAddress.join()

                const updated= await dynamo.updateTable(ddb, ddbQueries.updateEncryptedDataTable(user_id,constants.ADDRESS,fulladd)); 
                console.log('successfully Added/Updated Users Address')
                try
                {
                    let url2=`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fulladd)}&key=AIzaSyCSCk3BE2UzEdCR0-NcWzmnD2dTCv3Jcsg`
    
                    fetch(url2)
                    .then(function(response){
                    return response.json();
                    })
                    .then(async function(data)
                    {
                        coordinates=Object.values(data.results[0].geometry.location)
                        console.log(coordinates[0])
                        console.log(coordinates[1])

                        await dynamo.updateTable(ddb, ddbQueries.updateEncryptedDataTable(user_id,constants.LATITUDE,coordinates[0]));
                        await dynamo.updateTable(ddb, ddbQueries.updateEncryptedDataTable(user_id,constants.LONGITUDE,coordinates[1]));

                        console.log('Successfully added coordinates')
                        res.redirect('/restaurants')
                    })
                    .catch(function(err){
                        console.log(err);
                    })
                }
                catch(err)
                {
                    console.log('error is: '+err)
                }
            }
        })
        .catch(function(err)
        {
            console.log('Error: '+err)
        })
    }
    catch(err)
    {
        console.log(err)
    }
});

router.get('/support', function (req, res) {
    res.render('general/contact-us-page', {user_type: user_type});
});

module.exports = router;