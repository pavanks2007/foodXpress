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

/* GET home page. */
router.get('/', async function (req, res) {

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

router.route("/login")
.get(function (req, res) {

    try
    {
        res.render('general/generalLogin.ejs', { root: path.join(__dirname, '..', 'views') });
    }
    catch(err)
    {
        console.log("There is an error "+err)
    }
})
.post(async function (req, res) {
=======
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
        if (!userInfo.Item[constants.USER_ID]) 
            throw `User does not exist; provided ${user_id}`
        if (user_type != userInfo.Item[constants.USER_TYPE])
            throw `Usertype does not match; provided ${user_type}`
        if (password != userInfo.Item[constants.ENCRYPTED_CREDENTIAL]) 
            throw `Password does not match`
        console.log(`${user_type} ${user_id} successfully logged in.`);
        res.cookie('user_id', user_id, { signed: true });
        res.cookie('user_type', user_type, { signed: true });
        // res.send(`${user_type} ${user_id} successfully logged in.`);
        res.redirect('/'+user_type);
        // res.redirect('/restaurants');
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
    res.render('general/register.ejs', { root: path.join(__dirname, '..', 'views') });
})

router.post('/registerpg1', async function(req,res)//checks if user exists. If info is valid, move on to the next phase of registration
{
    const {user_id,user_name, email,password,confirmPass, user_type} = req.body;
    let createdAt = new Date().toString();

    const userNameData= await dynamo.getFromTable(ddb,ddbQueries.getUserCredentials(user_id))

    console.log(userNameData);

    req.checkBody('confirmPass', 'Passwords do not match').equals(password);

    if(userNameData.Item.hasOwnProperty(constants.ENCRYPTED_CREDENTIAL))
    {
        console.log('User Exists')
        res.redirect('/register')
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
    else
    {
        try{ 
            const newCustomer = await dynamo.putInTable(ddb, ddbQueries.putCustomer(user_id, user_name, email, user_type, createdAt,'', '','',password));
            console.log('Successfully added user: '+ user_id)
            res.redirect('/add_updateAddress/'+user_id)
        } catch (err) {
            
            console.log('there is an error: '+err )
        }
    }
})

router.get('/add_updateAddress/:rID',function(req,res)
{
    res.render("general/addAddress",{userID:req.params.rID} );
})

router.post('/add_updateAddress/:rID', async function (req, res) 
{
    
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
                    let url2=`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fulladd)}&key={delete curly brackets and add key}`
    
                    fetch(url2)
                    .then(function(response){
                    return response.json();
                    })
                    .then(async function(data)
                    {
                        coordinates=Object.values(data.results[0].geometry.location)
                        console.log(coordinates[0])
                        console.log(coordinates[1])

                        await dynamo.updateTable(ddb, ddbQueries.updateEncryptedDataTable(user_id,constants.LAT,coordinates[0]));
                        await dynamo.updateTable(ddb, ddbQueries.updateEncryptedDataTable(user_id,constants.LONG,coordinates[1]));

                        console.log('Successfully added coordinates')
                        res.redirect('/dashboard')
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

function distance(lat1, lon1, lat2, lon2, unit) {
    if ((lat1 == lat2) && (lon1 == lon2)) {
        return 0;
    }
    else {
        var radlat1 = Math.PI * lat1/180;
        var radlat2 = Math.PI * lat2/180;
        var theta = lon1-lon2;
        var radtheta = Math.PI * theta/180;
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }

        dist = Math.acos(dist);
        dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit=="K") { dist = dist * 1.609344 }
        if (unit=="N") { dist = dist * 0.8684 }
        return dist;
    }
}
module.exports = router;