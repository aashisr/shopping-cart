const mongoose = require('mongoose');
const Schema = mongoose.Schema;
//Automatically adds username and password field to the userSchema
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
    //Username and hash passwords will be automatically added by passportLocalMongoose plugin
    firstName: {
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
                product: { type: mongoose.Schema.Types.ObjectId, required: true, },
                quantity: { type: Number, required: true}
            }
        ]
    }
},{
    timestamps: true
});

//Use passportLocalMongoose as a plugin, set userName field to email instead of username
UserSchema.plugin(passportLocalMongoose, {"usernameField": "email"});

//Create a module and export
const Users = mongoose.model('User', UserSchema);
module.exports = Users;