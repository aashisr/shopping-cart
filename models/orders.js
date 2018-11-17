//import mongoose
const mongoose = require('mongoose');

//create variable for mongoose schema object
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    products: [
        {
            product: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }
    ],
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
},{
    timestamps: true
});

//export this model as a module to be used in other places
module.exports = mongoose.model('Order', orderSchema);