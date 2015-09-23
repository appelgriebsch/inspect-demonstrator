(function() {

  'use strict';

  function IncidentModule() {

    this.initialize = function() {

      angular.module('inspectApp')
        .config(function($stateProvider, $urlRouterProvider) {

          $stateProvider
            .state('app.incidents', {
              url: '/incidents',
              views: {
                'module': {
                  templateUrl: './modules/incidents/incidents.html'
                }
              }
            })
            .state('app.incidents.view', {
              url: '/view',
              views: {
                'content': {
                  templateUrl: './modules/incidents/templates/incidents.view.html',
                  controller: 'IncidentViewController as ctl'
                },
                'actions@app': {
                  templateUrl: './modules/incidents/templates/incidents.actions.html'
                }
              }
            });

        });

      var IncidentViewController = require('./scripts/IncidentViewController');

      angular.module('inspectApp').controller('IncidentViewController', ['$scope', '$q', 'ActivityService', IncidentViewController]);
    };
  }

  module.exports = IncidentModule;

})();
