/*
 * Serve JSON to our AngularJS client
 */

module.exports = function (app) {

    var app = app;
    var sessionId = '';

    exports.checkAdminCode = function(req, res){
        if (req.query.code == '0swald0') {
            const first = Math.floor((Math.random() * 1000));
            const second = Math.floor((Math.random() * 1000));
            sessionId = first + '-' + second;
            res.json({
                validation: true,
                sessionId: sessionId
            });
        } else {
            res.json({
                validation: false,
                sessionId: ''
            });
        }
    };

    exports.checkClientCode = function(req, res) {
        if (req.query.code == sessionId) {
            sessionId = '';
            res.json({
                validation: true
            });
        } else {
            res.json({
                validation: false
            });
        }
    };

    return exports;
};