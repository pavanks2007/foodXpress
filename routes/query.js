const constants = require('./constants.js')

module.exports = {
    deleteCoupon: (restaurant_id, coupon_id) => {
        return {
            TableName: constants.COUPONS_TABLE_NAME,
            Key: {
                [constants.RESTAURANT_ID] : restaurant_id,
                [constants.COUPON_ID] : coupon_id
            },
            ConditionExpression: `attribute_exists(${constants.COUPON_ID})`
        }
    },
    deleteMenuItem: (restaurant_id, item_id) => {
        return {
            TableName: constants.RESTAURANT_MENU_TABLE_NAME,
            Key: {
                [constants.RESTAURANT_ID] : restaurant_id,
                [constants.ITEM_ID] : item_id
            },
            ConditionExpression: `attribute_exists(${constants.ITEM_ID})`
        }
    },
    deleteUser: (userId) => {
        return {
            TableName: constants.ENCRYPTED_DATA_TABLE_NAME,
            Key: {
                [constants.USER_ID] : userId,
                [constants.SORT_KEY] : constants.DETAILS
            },
            ConditionExpression: `attribute_exists(${constants.SORT_KEY})`
        }
    },
    deleteRestaurant: (restaurant_id) => {
        return {
            TableName: constants.RESTAURANTS_AND_REVIEWS_TABLE_NAME,
            Key: {
                [constants.PRIMARY_KEY] : constants.DETAILS,
                [constants.SORT_KEY] : restaurant_id
            },
            ConditionExpression: `attribute_exists(${constants.SORT_KEY})`
        }
    },
    getOrderSummaryForCustomer: (orderId) => {
        return {
            TableName: constants.ORDER_SUMMARY_TABLE_NAME,
            Key: {
                [constants.ORDER_ID]: orderId
            },
            ProjectionExpression: `${constants.ORDER_ID},${constants.RESTAURANT_ID},${constants.ORDER_TYPE},${constants.FINAL_PRICE},${constants.DRIVER_ID},${constants.DATE_TIME},${constants.PAYMENT}`,
        }
    },
    scanAvailableDriver: ()=> {
        return {
            TableName: constants.DRIVER,
            ExpressionAttributeNames: {
                '#available': constants.DRIVER_AVAILABILITY,
            },
            ExpressionAttributeValues: {
                ':true': true,
            },
            FilterExpression : "#available = :true" ,
            ProjectionExpression: `${constants.DRIVER_ID}`,
        }
    },
    
    getOrderSummaryForDriver: (orderId) => {
        return {
            TableName: constants.ORDER_SUMMARY_TABLE_NAME,
            Key: {
                [constants.ORDER_ID]: orderId
            },
            ProjectionExpression: `${constants.ORDER_ID},${constants.RESTAURANT_ID},${constants.ORDER_TYPE},${constants.FINAL_PRICE},${constants.DRIVER_ID},${constants.DATE_TIME},${constants.DRIVER_EARNING}`,
        }
    },
    getOrderSummaryForRestaurant: (orderId) => {
        return {
            TableName: constants.ORDER_SUMMARY_TABLE_NAME,
            Key: {
                [constants.ORDER_ID]: orderId
            },
            ProjectionExpression: `${constants.ORDER_ID},${constants.RESTAURANT_ID},${constants.ORDER_TYPE},${constants.FINAL_PRICE},${constants.DRIVER_ID},${constants.DATE_TIME},${constants.RESTAURANT_EARNING}`,
        }
    },
    getUserDetails: (userId) => {
        return {
            TableName: constants.ENCRYPTED_DATA_TABLE_NAME,
            Key: {
                [constants.USER_ID]: userId,
                [constants.SORT_KEY]: constants.DETAILS
            },
            ProjectionExpression: `${constants.USER_ID}${constants.SORT_KEY},${constants.USER_NAME},${constants.USER_TYPE},${constants.CREATED_AT},${constants.ADDRESS}`,
        }
    },
    getUserCredentials: (userId) => {
        return {
            TableName: constants.ENCRYPTED_DATA_TABLE_NAME,
            Key: {
                [constants.USER_ID]: userId,
                [constants.SORT_KEY]: constants.DETAILS
            },
            ProjectionExpression: `${constants.USER_ID},${constants.ENCRYPTED_CREDENTIAL},${constants.USER_TYPE}`,
        }
    },
    getRestaurantDetails: (restaurant_id) => {
        return {
            TableName: constants.RESTAURANTS_AND_REVIEWS_TABLE_NAME,
            Key: {
                [constants.PRIMARY_KEY] : constants.DETAILS,
                [constants.SORT_KEY] : restaurant_id
            },
            ProjectionExpression: `${constants.SORT_KEY},${constants.RESTAURANT_NAME},${constants.RESTAURANT_ADDRESS},${constants.OPEN_TIME},${constants.CLOSE_TIME},${constants.CONTACT},${constants.CUISINE},${constants.RATING}`,
        }
    },
    putCoupon: (restaurant_id, coupon_id, coupon_value, used, expiration_time) => {
        return {
            TableName: constants.COUPONS_TABLE_NAME,
            Item:{
                [constants.RESTAURANT_ID]: restaurant_id, 
                [constants.COUPON_ID]: coupon_id,
                [constants.COUPON_VALUE]: coupon_value,
                [constants.USED]: used,
                [constants.EXPIRATION_TIME]: expiration_time,
            }
        }
    },
    putCustomer: (userId, username, email, userType, createdAt, address, encryptedCredential) => {
        return {
            TableName: constants.ENCRYPTED_DATA_TABLE_NAME,
            Item:{
                [constants.USER_ID]: userId, 
                [constants.SORT_KEY]: constants.DETAILS,
                [constants.USER_NAME]: username,
                [constants.EMAIL]: email,
                [constants.USER_TYPE]: userType,
                [constants.CREATED_AT]: createdAt,
                [constants.ADDRESS]: address,
                [constants.ENCRYPTED_CREDENTIAL]: encryptedCredential
            }
        }
    },
    putMenuItemInRestaurant: (restaurant_id, item_id, item_name, item_price, description) => {
        return {
            TableName: constants.RESTAURANT_MENU_TABLE_NAME,
            Item:{
                [constants.RESTAURANT_ID]: restaurant_id, 
                [constants.ITEM_ID]: item_id,
                [constants.ITEM_NAME]: item_name,
                [constants.ITEM_PRICE]: item_price,
                [constants.DESCRIPTION]: description              
            }
        }
    },
    putOrderSummary: (order_id, customer_id, restaurant_id, driver_id, items_price, taxes, surge_fee, total_tip, coupon_used, coupon_value, final_price, mode, createdAt) => {
        console.log(order_id, customer_id, restaurant_id, driver_id);
        return {
            TableName: constants.ORDER_SUMMARY_TABLE_NAME,
            Item:{
                [constants.ORDER_ID]: order_id, 
                [constants.USER_ID]: customer_id,
                [constants.RESTAURANT_ID]: restaurant_id, 
                [constants.DRIVER_ID]: driver_id,
                [constants.ITEMS_PRICE]: items_price,
                [constants.TAXES]: taxes,
                [constants.SURGE_FEE]: surge_fee, 
                [constants.TOTAL_TIP]: total_tip,
                [constants.COUPON_USED]: coupon_used,
                [constants.COUPON_VALUE]: coupon_value,
                [constants.FINAL_PRICE]: final_price,
                [constants.MODE]: mode,
                [constants.CREATED_AT]: createdAt
            }
      }
    },
    putRestaurant: (restaurantId, restaurantName, restaurantAddress, openTime, closeTime, contact, cuisine, rating, minimum_order) => {
        return {
            TableName: constants.RESTAURANTS_AND_REVIEWS_TABLE_NAME,
            Item: {
                [constants.PRIMARY_KEY]: constants.DETAILS,
                [constants.SORT_KEY]: restaurantId,
                [constants.RESTAURANT_NAME]: restaurantName,
                [constants.RESTAURANT_ADDRESS]: restaurantAddress,
                [constants.OPEN_TIME]: openTime,
                [constants.CLOSE_TIME]: closeTime,
                [constants.CONTACT]: contact,
                [constants.CUISINE]: cuisine,
                [constants.RATING]: rating,
                [constants.MINIMUM_ORDER]: minimum_order
            }
        }
    },
    putReviewForRestaurant: (restaurantId, userId, createdAt, review, rating) => {
        return {
            TableName: constants.RESTAURANTS_AND_REVIEWS_TABLE_NAME,
            Item: {
                [constants.PRIMARY_KEY]: restaurantId, 
                [constants.SORT_KEY]: userId,
                [constants.CREATED_AT]: createdAt,
                [constants.REVIEW]: review,
                [constants.RATING]: rating
            },
        }
    },
    queryCouponsForRestaurant: (restaurantId) => {
        return {
            TableName: constants.COUPONS_TABLE_NAME,
            KeyConditionExpression: '#pk = :id',
            ProjectionExpression: `${constants.RESTAURANT_ID},${constants.COUPON_ID},${constants.COUPON_VALUE},${constants.COUPON_USED},${constants.EXPIRATION_TIME}`,
            ExpressionAttributeNames: {
                '#pk': constants.RESTAURANT_ID,
            },
            ExpressionAttributeValues: {
                ':id': restaurantId,
            },
        }
    },
    queryListOfItemsInOrder: (orderId) => {
        return {
            TableName: constants.ORDER_ITEMS_TABLE_NAME,
            KeyConditionExpression: '#pk = :id',
            ProjectionExpression: `${constants.ITEM_ID},${constants.ITEM_NAME},${constants.QUANTITY}`,
            ExpressionAttributeNames: {
                '#pk': constants.ORDER_ID,
            },
            ExpressionAttributeValues: {
                ':id': orderId,
            },
        }
    },
    queryListOfRestaurants: () => {
        return {
            TableName: constants.RESTAURANTS_AND_REVIEWS_TABLE_NAME,
            KeyConditionExpression: '#pk = :details',
            ProjectionExpression: `${constants.SORT_KEY},${constants.RESTAURANT_NAME},${constants.RESTAURANT_ADDRESS},${constants.OPEN_TIME},${constants.CLOSE_TIME},${constants.CONTACT},${constants.CUISINE},${constants.RATING}`,
            ExpressionAttributeNames: {
                '#pk': constants.PRIMARY_KEY,
            },
            ExpressionAttributeValues: {
                ':details': constants.DETAILS,
            },
        }
    },
    queryCustomerDetails: (userId) => {
        return {
            TableName: constants.ENCRYPTED_DATA_TABLE_NAME,
            KeyConditionExpression: '#pk = :id',
            ProjectionExpression: `${constants.USER_NAME},${constants.ADDRESS},${constants.USER_TYPE}`,
            ExpressionAttributeNames: {
                '#pk': constants.USER_ID,
            },
            ExpressionAttributeValues: {
                ':id': userId,
            },
        }
    },
    queryListOfReviewsForRestaurant: (restaurantId) => {
        return {
            TableName: constants.RESTAURANTS_AND_REVIEWS_TABLE_NAME,
            KeyConditionExpression: '#pk = :id',
            ProjectionExpression: `${constants.USER_ID},${constants.CREATED_AT},${constants.REVIEW}`,
            ExpressionAttributeNames: {
                '#pk': constants.PRIMARY_KEY,
            },
            ExpressionAttributeValues: {
                ':id': restaurantId,
            },
        }
    },
    queryMenuItemsInRestaurant : (restaurantId) => {
        return {
            TableName: constants.RESTAURANT_MENU_TABLE_NAME,
            KeyConditionExpression: '#pk = :id',
            ProjectionExpression: `${constants.RESTAURANT_ID},${constants.ITEM_ID},${constants.ITEM_NAME},${constants.ITEM_PRICE}`,
            ExpressionAttributeNames: {
                '#pk': constants.RESTAURANT_ID,
            },
            ExpressionAttributeValues: {
                ':id': restaurantId,
            },
        }
    },
    queryOrderItems: (orderId) => {
        return {
            TableName: constants.ORDER_ITEMS_TABLE_NAME,
            KeyConditionExpression: '#pk = :id',
            ProjectionExpression: `${constants.ORDER_ID},${constants.RESTAURANT_ID},${constants.ITEM_ID},${constants.ITEM_NAME},${constants.QUANTITY}`,
            ExpressionAttributeNames: {
                '#pk': constants.ORDER_ID,
            },
            ExpressionAttributeValues: {
                ':id': orderId,
            },
        }
    },
    queryPreviousOrdersForCustomer: (userId) => {
        return {
            TableName: constants.ORDER_SUMMARY_TABLE_NAME,
            IndexName: constants.ORDER_SUMMARY_USER_ID_INDEX,
            KeyConditionExpression: '#pk = :id',
            ProjectionExpression: `${constants.ORDER_ID},${constants.RESTAURANT_ID},${constants.ORDER_TYPE},${constants.FINAL_PRICE},${constants.DRIVER_ID},${constants.DATE_TIME},${constants.PAYMENT}`,
            ExpressionAttributeNames: {
                '#pk': constants.USER_ID,
            },
            ExpressionAttributeValues: {
                ':id': userId,
            },
        }
    },
    queryPreviousOrdersForDriver: (driverId) => {
        return {
            TableName: constants.ORDER_SUMMARY_TABLE_NAME,
            IndexName: constants.ORDER_SUMMARY_DRIVER_ID_INDEX,
            KeyConditionExpression: '#pk = :id',
            ProjectionExpression: `${constants.ORDER_ID},${constants.RESTAURANT_ID},${constants.ORDER_TYPE},${constants.FINAL_PRICE},${constants.DRIVER_ID},${constants.DATE_TIME},${constants.DRIVER_EARNING}`,
            ExpressionAttributeNames: {
                '#pk': constants.DRIVER_ID,
            },
            ExpressionAttributeValues: {
                ':id': driverId,
            },
        }
    },
    queryPreviousOrdersForRestaurant: (restaurantId) => {
        return {
            TableName: constants.ORDER_SUMMARY_TABLE_NAME,
            IndexName: constants.ORDER_SUMMARY_RESTAURANT_ID_INDEX,
            KeyConditionExpression: '#pk = :id',
            ProjectionExpression: `${constants.ORDER_ID},${constants.RESTAURANT_ID},${constants.ORDER_TYPE},${constants.FINAL_PRICE},${constants.DRIVER_ID},${constants.DATE_TIME},${constants.RESTAURANT_EARNING}`,
            ExpressionAttributeNames: {
                '#pk': constants.RESTAURANT_ID,
            },
            ExpressionAttributeValues: {
                ':id': restaurantId,
            },
        }
    },
    updateRestaurantDetail: (restaurant_id, key, value) => {
        return {
            TableName: constants.RESTAURANTS_AND_REVIEWS_TABLE_NAME,
            Key: {
                [constants.PRIMARY_KEY] : constants.DETAILS,
                [constants.SORT_KEY] : restaurant_id
            },
            UpdateExpression: 'set #key = :value',
            ExpressionAttributeNames: {
                '#key': key
            },
            ExpressionAttributeValues: {
                ':value': value
            }
        }
    },
    updateOrderforDriver: (order_id, key, value) => {
        console.log(order_id, key,value)
        return {
            TableName: constants.ORDER_SUMMARY_TABLE_NAME,
            Key: {
                [constants.ORDER_ID] : order_id,
            },
            UpdateExpression: 'set #key = :value',
            ExpressionAttributeNames: {
                '#key': [constants.DRIVER_ID],
            },
            ExpressionAttributeValues: {
                ':value': value
            }
        }
    },
    updateEncryptedDataTable: (user_id, col_name, col_value) => {
        return updateTable(
            constants.ENCRYPTED_DATA_TABLE_NAME,
            {
                [constants.USER_ID]: user_id,
                [constants.SORT_KEY]: constants.DETAILS
            },
            col_name,
            col_value
        )
    },
    scanAllUserIds: ()=> {
        return {
            TableName: constants.ENCRYPTED_DATA_TABLE_NAME,
            ProjectionExpression: `${constants.USER_ID}`,
        }
    },

}

/*
{
    TableName: 'Restaurants_and_Reviews',
    Item: {
        restaurant_id: '', 
        sk: 'DETAILS',
        restaurant_name: '',
        restaurant_address: '',
        open_time: '8:30',
        close_time: '22:00',
        contact: '1234567890',
        cuisine: '',
        rating: '3'
    }
}

For each item
{
    TableName: 'Restaurant_Menu',
    Item: {
        restaurant_id: '', 
        item_id: '',
        item_name: '',
        item_price: '',
        description: ''
    }
}

restaurant_id as 0, 1, 2, 3 and s0 on
item_id as 0, 1, 2, 3 and s0 on for each restaurant


batchGetRoomsDetails: (roomIds) => {
    return {
        RequestItems:{
            [constants.DDB_TABLE_NAME]: {
                Keys: roomIds.map(roomId => {
                    return {
                        'pk': 'ROOMS', 
                        'sk': roomId
                    }
                })
            }
        }
    }
},
deleteConnectionInRoom: (roomId, connectionId) => {
    return {
        TableName: constants.DDB_TABLE_NAME,
        Key: {
            'pk': roomId,
            'sk': connectionId
        },
    }
},
getUserDetails: (userId) => {
    return {
        TableName: constants.DDB_TABLE_NAME,
        Key: {
            'pk': constants.USERS,
            'sk': userId
        },
    }
},
putRoom: (roomId, roomDetails) => {
    return {
        TableName: constants.DDB_TABLE_NAME,
        Item: {
            [constants.PRIMARY_KEY]: constants.ROOMS, 
            [constants.SORT_KEY]: roomId,
            [constants.TYPE]: constants.ROOM,
            ...roomDetails,
            [constants.CLOSED_TIMESTAMP]: ''
        },
        ConditionExpression: `attribute_not_exists(${constants.SORT_KEY})`
    }
},
queryAllLiveRequestRoomsDetails: (roomGroupId) => {
    return {
        TableName: constants.DDB_TABLE_NAME,
        IndexName: constants.DDB_TABLE_INDEX_NAME,
        KeyConditionExpression: '#pk = :rooms',
        FilterExpression: '#col1 = :room_group_id AND #col2 = :room_type AND #col3 = :closed_timestamp',
        ProjectionExpression: `${constants.SORT_KEY},${constants.USERNAME},${constants.PROFILE_NAME},#role`,
        ExpressionAttributeNames: {
            '#pk': constants.PRIMARY_KEY,
            '#col1': constants.ROOM_GROUP_ID,
            '#col2': constants.ROOM_TYPE,
            '#col3': constants.CLOSED_TIMESTAMP
        },
        ExpressionAttributeValues: {
            ':rooms': constants.ROOMS,
            ':room_group_id': roomGroupId,
            ':room_type': constants.REQUEST,
            ':closed_timestamp': ''
        },
    }
},
updateUserLeftRoom: (roomId, connectionId, leftTimestamp) => {
    return {
        TableName: constants.DDB_TABLE_NAME,
        Key: {
            [constants.PRIMARY_KEY]: roomId, 
            [constants.SORT_KEY]: connectionId,
        },
        UpdateExpression: 'set #key = :value',
        ExpressionAttributeNames: {
            '#key': [constants.LEFT_TIMESTAMP]
        },
        ExpressionAttributeValues: {
            ':value': leftTimestamp
        }
    }
}

*/