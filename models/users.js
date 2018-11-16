const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
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

//Create a module and export
const Users = mongoose.model('User', UserSchema);
module.exports = Users;