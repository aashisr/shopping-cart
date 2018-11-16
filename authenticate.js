exports.isLoggedIn = (req, res, next) => {
    //If req.session.authenticated is not true, user is not logged in.
    if (!req.session.authenticated){
        res.redirect('/users/login');
    }

    //if logged in, continue to next middleware
    next();
};