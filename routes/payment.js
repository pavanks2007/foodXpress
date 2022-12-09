const express = require('express');
const path = require('path');
const router = express.Router();
const constants = require('./constants.js');
const dynamo = require('./dynamo.js')
const ddbQueries = require('./query.js');

const ddb = dynamo.getDynamoDbClient();
const paypal = require('paypal-rest-sdk');

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': 'AaMQhQJJ9rbV2fBrTSiYLMEhZMx4Dxq26JGawovRBbRW24dMLtJ7_171Zy78QAO3mjjCNIh85eIziQNn',
  'client_secret': 'EMfiAVH-mVnTRGctW029hm3rrOpO7AVaXyI4790ZvwJrbslZ0T2OyFq5ZlhCbfBI0i4Vak7o4zK0NxTF'
});

// router.get('/', async function (req, res, next) {
//     res.render('customer/payment.ejs', { root: path.join(__dirname, '..', 'views') });
// });

router.get('/', function (req, res, next) {
  res.sendFile('cart.html', { root: path.join(__dirname, '..', 'views/customer') });
});


router.post('/pay', (req, res) => {
  const data = req.body;
  // console.log(data);
  const items = [];
  for (const id in data["cart"]) {
    items.push({
      "name": data["products"][id]["name"],
      "sku": id,
      "price": data["products"][id]["price"].toFixed(2),
      "currency": "USD",
      "quantity": data["cart"][id]
    });
  }

  const create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    "redirect_urls": {
        "return_url": "http://localhost:3000/payment/success",
        "cancel_url": "http://localhost:3000/payment/cancel"
    },
    "transactions": [{
        "item_list": {
            "items": items
        },
        "amount": {
            "currency": "USD",
            "total": data["total_cost"].toFixed(2)
        },
        "description": ""
    }]
  };

  paypal.payment.create(create_payment_json, function (error, payment) {
    console.log("items", items);
    console.log(data["total_cost"].toFixed(2));
    if (error) {
        throw error;
    } else {
        for(let i = 0;i < payment.links.length;i++){
          console.log(payment.links[i]);
          if(payment.links[i].rel === 'self') {
            paypalStore[payment.links[i].href.substring("https://api.sandbox.paypal.com/v1/payments/payment/".length)] = data["total_cost"].toFixed(2);
          }
          if(payment.links[i].rel === 'approval_url'){
            res.json({redirect: payment.links[i].href});
          }
        }
    }
    console.log(paypalStore);
  });

});

router.get('/success', (req, res) => {
  console.log(req.query);
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
        "amount": {
          "currency": "USD",
          "total": paypalStore[paymentId]
        }
    }]
  };
  delete paypalStore[paymentId];

  // Obtains the transaction details from paypal
  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    console.log(JSON.stringify(payment, null, 4));
      //When error occurs when due to non-existent transaction, throw an error else log the transaction details in the console then send a Success string reposponse to the user.
    if (error) {
        console.log(error.response);
        throw error;
    } else {
        const result = {
          "order_id": payment["id"],
          "payment_method": payment["payer"]["payment_method"],
          "total_amount": payment["transactions"][0]["amount"]["total"],
          "order_items": getOrderItems(payment["transactions"][0]["item_list"]["items"])
        };
        res.send(result);
    }
  });
});

function getOrderItems(order) {
  order.map(function(item){
    return {
      "item_id": item["sku"],
      "item_name": item["name"],
      "item_price": item["price"],
      "quantity": item["quantity"]
    };
  })
}

router.get('/cancel', (req, res) => res.send('Cancelled'));

module.exports = router;