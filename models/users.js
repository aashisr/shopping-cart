const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },    firstName: {
        type: String,
        default: ''
    },
    lastName: {
        type: String,
        default: ''
    },
    admin : {
        type: Boolean,
        default: false
    },
    cart: {
        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true
                },
                quantity: { type: Number, required: true}
            }
        ]
    }
},{
    timestamps: true
});

//Implement a method to add products to the cart
//Does not support arrow function as it prevents binding 'this'
userSchema.methods.addToCart = function (product) {
    console.log('Add to cart: ', product);
    //Find if the product is already in the cart
    //For that, find the index of the product id in the cart.items array
    const cartProductIndex = this.cart.items.findIndex((cp) => {
        //Returns true or false based on this result, if true findIndex returns the index of the product
        //Convert both ids to strings to be sure that type matches
        return cp.product.toString() === product._id.toString();
    });

    let newQuantity = 1;
    //Copy the items in cart to this constant
    //... is an spread operator which gets all the properties of the cart.items object
    const updatedCartItems = [...this.cart.items];

    //If the item exists in the cart, i.e if cartProductIndex is not negative
    if (cartProductIndex >= 0){
        //Increase the quantity of that item by 1
        newQuantity = this.cart.items[cartProductIndex].quantity + 1;
        //Update the quantity of the product added
        updatedCartItems[cartProductIndex].quantity = newQuantity;
    }
    else {
        //If the product did not exist already, push that product id to the updatedCartItems array
        updatedCartItems.push({
            product: product._id,
            quantity: newQuantity
        });
    }

    //Cart is an array of items, so updatedCart is the array of updatedCartItems
    const updatedCart = { items: updatedCartItems };

    //Save the updated cart and return
    this.cart = updatedCart;
    return this.save();

    //Find the user and update the cart of that user
};

//Create a module and export
const Users = mongoose.model('User', userSchema);
module.exports = Users;