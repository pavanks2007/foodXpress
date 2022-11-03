const constants = require('./constants.js')

module.exports = {
    getOrderSummaryForUser: (orderId) => {
        return {
            TableName: constants.ORDER_SUMMARY_TABLE_NAME,
            Key: {
                [constants.ORDER_ID]: orderId
            },
            ProjectionExpression: `${constants.ORDER_ID},${constants.RESTAURANT_ID},${constants.ORDER_TYPE},${constants.FINAL_PRICE},${constants.DRIVER_ID},${constants.DATE_TIME},${constants.PAYMENT}`,
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
    putReviewForRestaurant: (restaurantId, userId, createdAt, review) => {
        return {
            TableName: constants.RESTAURANTS_AND_REVIEWS_TABLE_NAME,
            Item: {
                [constants.PRIMARY_KEY]: restaurantId, 
                [constants.SORT_KEY]: userId,
                [constants.CREATED_AT]: createdAt,
                [constants.REVIEW]: review
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
            ProjectionExpression: `${constants.RESTAURANT_ID},${constants.RESTAURANT_NAME},${constants.RESTAURANT_ADDRESS},${constants.OPEN_TIME},${constants.CLOSE_TIME},${constants.CONTACT},${constants.CUISINE},${constants.RATING}`,
            ExpressionAttributeNames: {
                '#pk': constants.PRIMARY_KEY,
            },
            ExpressionAttributeValues: {
                ':details': constants.DETAILS,
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
    queryPreviousOrdersForUser: (userId) => {
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