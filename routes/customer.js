const express = require('express');
const path = require('path');
const router = express.Router();

/* GET home page. */
router.get('/support/:customerId', function(req, res, next) {
  res.sendFile('users.html', { root: path.join(__dirname, '..', 'views') });
});

module.exports = router;