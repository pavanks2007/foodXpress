window.addEventListener("DOMContentLoaded", function() {
  const products = {};
  const items = Array.prototype.slice.call( document.getElementById("cart-products").children)
  for (var item in items) {
    const temp = Array.prototype.slice.call( items[item].children);
    console.log(temp[4].innerHTML.slice(1));
    products[temp[1].innerHTML] = {
      name : temp[2].innerHTML,
      price : parseFloat(temp[3].innerHTML.slice(1))
    };
  }

  const cart_min = parseFloat(document.getElementById('cart-min').innerHTML);
  const cart_max = parseFloat(document.getElementById('cart-max').innerHTML);
  const tax = parseFloat(document.getElementById('cart-tax').innerHTML);
  const surge_fee = parseFloat(document.getElementById('cart-surge').innerHTML);
  const total_tip = 5;
  const restaurant_id = document.getElementById("restaurant_id").innerHTML;
  const restaurant_name = document.getElementById("restaurant_name").innerHTML;

  var cart = {
    // (A) PROPERTIES
    hPdt : null,      // html products list
    hItems : null,    // html current cart
    items : {},       // current items in cart
    iURL : "/images/", // product image url folder

    // (B) LOCALSTORAGE CART
    // (B1) SAVE CURRENT CART INTO LOCALSTORAGE
    save : () => {
      localStorage.setItem("cart", JSON.stringify(cart.items));
    },

    // (B2) LOAD CART FROM LOCALSTORAGE
    load : () => {
      cart.items = localStorage.getItem("cart");
      if (cart.items == null) { cart.items = {}; }
      else { cart.items = JSON.parse(cart.items); }
    },

    // (B3) EMPTY ENTIRE CART
    nuke : () => { if (confirm("Empty cart?")) {
      cart.items = {};
      localStorage.removeItem("cart");
      cart.list();
    }},

    // (C) INITIALIZE
    init : () => {
      // (C1) GET HTML ELEMENTS
      cart.hPdt = document.getElementById("cart-products");
      cart.hItems = document.getElementById("cart-items");

    // (C1) DRAW PRODUCTS LIST
    for (let id in products) {
      const item = document.getElementById(id+"-button");
      if(item != null)
        item.onclick = () => { cart.add(id); };
    }
      // (C2) LIST CURRENT CART ITEMS
      cart.list();
    },

    // (D) LIST CURRENT CART ITEMS (IN HTML)
    list : () => {
      // (D1) RESET
      cart.hItems.innerHTML = "";
      let item, part, pdt, empty = true;
      for (let key in cart.items) {
        if (cart.items.hasOwnProperty(key)) { empty = false; break; }
      }

      // (D2) CART IS EMPTY
      if (empty) {
        item = document.createElement("div");
        item.innerHTML = "Empty Cart";
        cart.hItems.appendChild(item);
      }

      // (D3) CART IS NOT EMPTY - LIST ITEMS
      else {
        let template = document.getElementById("template-cart").content,
            p, total = 0, subtotal = 0;
        for (let id in cart.items) {
          // (D3-1) PRODUCT ITEM
          p = products[id];
          item = template.cloneNode(true);
          console.log(id, products);
          item.querySelector(".c-del").onclick = () => { cart.remove(id); };
          item.querySelector(".c-name").textContent = p.name;
          item.querySelector(".c-qty").value = cart.items[id];
          item.querySelector(".c-qty").onchange = function () { cart.change(id, this.value); };
          cart.hItems.appendChild(item);

          // (D3-2) SUBTOTAL
          subtotal = cart.items[id] * p.price;
          total += subtotal;
        }

        // (D3-3) TOTAL AMOUNT
        item = document.createElement("div");
        item.className = "c-items-price";
        item.id = "c-items-price";
        item.innerHTML = "Items price: $"+total.toFixed(2);
        cart.hItems.appendChild(item);

        item = document.createElement("div");
        item.className = "c-tax";
        item.id = "c-tax";
        item.innerHTML = "Taxes: $"+(total*tax).toFixed(2);
        cart.hItems.appendChild(item);

        item = document.createElement("div");
        item.className = "c-surge";
        item.id = "c-surge";
        item.innerHTML = "Surge Fees: $"+surge_fee.toFixed(2);
        cart.hItems.appendChild(item);

        item = document.createElement("div");
        item.className = "c-tip";
        item.id = "c-tip";
        item.innerHTML = "Driver Tip: $"+total_tip.toFixed(2);
        cart.hItems.appendChild(item);

        item = document.createElement("div");
        item.className = "c-total";
        item.id = "c-total";
        item.innerHTML = "Final Price: $"+(total + total*tax + surge_fee + total_tip).toFixed(2);
        cart.hItems.appendChild(item);

        // (D3-4) EMPTY & CHECKOUT
        item = document.getElementById("template-cart-checkout").content.cloneNode(true);
        item.children[0].onclick = () => { cart.nuke(); };
        item.children[1].onclick = () => { cart.checkout(); };
        cart.hItems.appendChild(item);
      }
    },

    // (E) ADD ITEM INTO CART
    add : (id) => {
      if (cart.items[id] == undefined) { cart.items[id] = 1; }
      else { cart.items[id]++; }
      cart.save(); cart.list();
    },

    // (F) CHANGE QUANTITY
    change : (pid, qty) => {
      // (F1) REMOVE ITEM
      if (qty <= 0) {
        delete cart.items[pid];
        cart.save(); cart.list();
      }

      // (F2) UPDATE TOTAL ONLY
      else {
        cart.items[pid] = qty;
        var total = 0;
        for (let id in cart.items) {
          total += cart.items[id] * products[id].price;
          document.getElementById("c-total").innerHTML ="TOTALs: $" + total;
        }
      }
    },

    // (G) REMOVE ITEM FROM CART
    remove : (id) => {
      delete cart.items[id];
      cart.save();
      cart.list();
    },

    // (H) CHECKOUT
    checkout : () => {
      const items_price = document.getElementById("c-items-price").innerHTML.slice("Items price: $".length);
      const taxes = document.getElementById("c-tax").innerHTML.slice("Taxes: $".length);
      const surge = document.getElementById("c-surge").innerHTML.slice("Surge Fees: $".length);
      const total_tip = document.getElementById("c-tip").innerHTML.slice("Driver Tip: $".length);
      const coupon_used = "";
      const coupon_value = parseFloat("0").toFixed(2);
      const final_price = document.getElementById("c-total").innerHTML.slice("Final price: $".length);

      if(!window.location.href.includes("customer"))
        this.alert("Please login as customer to checkout");
      else if(final_price < cart_min || final_price > cart_max )
        alert(`Total price should be between \$${cart_min} and \$${cart_max}`);
      else {
        const items = [];
        for (const id in cart.items) {
          items.push({
            "item_id": id,
            "item_name": products[id]["name"],
            "item_price": products[id]["price"].toFixed(2),
            "quantity": cart.items[id]
          });
        }

        const data = {
          "restaurant_id": restaurant_id,
          "restaurant_name": restaurant_name,
          "items_price": items_price,
          "taxes": taxes,
          "surge_fee": surge_fee,
          "total_tip": total_tip,
          "coupon_used": coupon_used,
          "coupon_value": coupon_value,
          "final_price": final_price,
          "mode": "Delivery",
          "items": items
        };
        
        fetch("/customer/orderPayment", { 
          method:"POST", 
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })
        .then((res) => {
          return res.json();
        })
        .then((res) => {
          console.log("test",res);
          if (res.redirect) {
            window.location.replace(res.redirect);
          }
        })
        .catch((err) => { console.error(err); });
      }
    }
  };
  cart.init();
});