const isLogin = async (req, res, next) => {
    try {
        if (req.session.user) {
            next(); // Proceed if the user is logged in
        } else {
            res.redirect('/'); // Redirect to login page if not logged in
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send('An error occurred during login check');
    }
};

const isLogout = async (req, res, next) => {
    try {
        if (req.session.user) {
            res.redirect('/dashboard'); // Redirect to dashboard if logged in
        } else {
            next(); // Proceed if the user is logged out
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send('An error occurred during logout check');
    }
};

module.exports = { isLogin, isLogout };
