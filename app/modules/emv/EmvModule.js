(function(angular) {

    'use strict';

    function EmvModule(config) {

        var moduleConfig = config;

        angular.module('electron-app')
            .config(function($stateProvider, $urlRouterProvider) {

                $stateProvider
                    .state(`${moduleConfig.state}`, {
                        url: '/emv',
                        views: {
                            'module': {
                                templateUrl: `${moduleConfig.path}/emv.html`
                            },
                            'header@app': {
                                template: `${moduleConfig.label}`
                            }
                        },
                        redirectTo: `${moduleConfig.state}.view`
                    })
                    .state(`${moduleConfig.state}.view`, {
                        url: '/view',
                        views: {
                            'content': {
                                templateUrl: `${moduleConfig.path}/views/emv.view.html`,
                                controller: 'EmvViewController as ctl'
                            }
                        }
                    });
            });

        var EmvViewController = require('./controllers/EmvViewController');
        angular.module('electron-app').controller('EmvViewController', ['$scope', '$state', '$q', EmvViewController]);
    }

    module.exports = EmvModule;

})(global.angular);