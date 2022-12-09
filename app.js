const path = require('path');
const express = require('express');
// require('express-async-errors');
const createError = require('http-errors');
const http = require('http');
const cookieParser = require('cookie-parser');
const expressValidator = require('express-validator');
const bodyParser = require('body-parser');

const multer = require('multer');

const app = express();
const indexRouter = require('./routes/index');
const customerRouter = require('./routes/customer');
const managerRouter = require('./routes/manager');
const adminRouter = require('./routes/admin');
const driverRouter = require('./routes/driver');
const constants = require('./routes/constants.js');
const { USER_TYPE } = require('./routes/constants.js');

const secret = 'Test123';

// Set path to views directory

app.use(cookieParser(secret));
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:false}));
app.use(expressValidator());

app.use((req, res, next) => {
    // Middleware to validate cookies based on user_type: customer, manager, driver, admin
    const url = req.url.slice(1)
    switch (url) {
        case url.startsWith(constants.CUSTOMER):
            if(!validateCookie(req.signedCookies, constants.CUSTOMER)) res.redirect("/");
            else next()
            break;
        case url.startsWith(constants.MANAGER):
            if(!validateCookie(req.signedCookies, constants.MANAGER)) res.redirect("/");
            else next()
            break;
        case url.startsWith(constants.DRIVER):
            if(!validateCookie(req.signedCookies, constants.DRIVER)) res.redirect("/");
            else next()
            break;
        case url.startsWith(constants.ADMIN):
            if(!validateCookie(req.signedCookies, constants.ADMIN)) res.redirect("/");
            else next()
            break;
        default:
            next()
            break;
    }
})

app.use('/', indexRouter);
app.use('/customer', customerRouter);
app.use('/manager', managerRouter);
app.use('/admin', adminRouter);
app.use('/driver', driverRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
}); 

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    // res.locals.error = req.app.get('env') === 'development' ? err : {};
    
    // render the error page
    res.status(err.status || 500);
    res.sendFile('error.html', { root: app.get('views') });
});


function validateCookie(signedCookies, user_type) {
    try {
        return signedCookies[constants.USER_ID] !== undefined && 
            signedCookies[USER_TYPE] !== undefined &&
            signedCookies[USER_TYPE] === user_type
    } catch (error) {
        return false
    }
}

module.exports = app;
