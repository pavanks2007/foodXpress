const path = require('path');
const express = require('express');
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
const paymentRouter = require('./routes/payment');
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


app.use('/', indexRouter);
app.use('/customer', customerRouter);
app.use('/manager', managerRouter);
app.use('/admin', adminRouter);
app.use('/driver', driverRouter);
app.use('/payment', paymentRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
}); 

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.sendFile('error.html', { root: app.get('views') });
});

module.exports = app;
