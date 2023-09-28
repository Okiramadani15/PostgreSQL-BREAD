module.exports = {
    isLoggedIn: function (req, res, next) {
        if(req.session.users){
        next()
        } else {
            res.redirect('/')
        }
    } 
}