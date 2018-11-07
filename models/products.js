//import mongoose
const mongoose = require('mongoose');

//create variable for mongoose schema object
const Schema = mongoose.Schema;

//Require the mongoose-currency node module and load the new type to mongoose
require('mongoose-currency').loadType(mongoose);
//Now, Currency is the new data type in mongoose just like Number or String
const Currency = mongoose.Types.Currency;

//create a new schema or a blueprint for products object
const productSchema = new Schema({
    imagePath: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    price: {
        type: Currency,
        required: true,
        min: 0
    }
}, {
    //Creates the created and modified time automatically
    timestamps: true
});

//export this model as a module to be used in other places
module.exports = mongoose.model('Product', productSchema);