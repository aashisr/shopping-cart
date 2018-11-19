exports.isLoggedIn = (req, res, next) => {
    //If req.session.authenticated is not true, user is not logged in.
    if (!req.session.authenticated){
        res.redirect('/users/login');
    }

    //if logged in, continue to next middleware
    next();
};

exports.isAdmin = (req, res, next) => {
    //Check if the user is admin or not
    if (req.user.admin === true) {
        next();
    } else {
        req.flash('error', 'You must be an admin to perform this operation.');
        res.redirect('/');
    }
};