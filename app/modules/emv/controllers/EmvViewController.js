(function() {

    'use strict';

    function EmvViewController($scope, $state, $q) {
        var path = require('path');
        this.events = [];
        this.emvStartScreen = path.join(__dirname, '../assets', 'slice1.png');
        this.emvTime1 = path.join(__dirname, '../assets', 'slice2.png');
        this.emvTime2 = path.join(__dirname, '../assets', 'slice3.png');

        this.initialize = function() {};
    }

    module.exports = EmvViewController;

})();