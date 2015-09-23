(function() {

  'use strict';

  angular.module('inspectApp', ['ngMaterial', 'ngSanitize', 'angular-timeline', 'ui.router'])
    .run(
      ['$rootScope', '$state', '$stateParams',
        function($rootScope, $state, $stateParams) {
          // It's very handy to add references to $state and $stateParams to the $rootScope
          // so that you can access them from any scope within your applications.For example,
          // <li ng-class="{ active: $state.includes('contacts.list') }"> will set the <li>
          // to active whenever 'contacts.list' or one of its decendents is active.
          $rootScope.$state = $state;
          $rootScope.$stateParams = $stateParams;
        }
      ]
    )
    .config(function($mdThemingProvider) {
      $mdThemingProvider.theme('default')
        .primaryPalette('blue-grey')
        .accentPalette('grey');
    });

  angular.module('inspectApp')
    .config(function($stateProvider, $urlRouterProvider) {

      // for all unmatched entries
      $urlRouterProvider.otherwise('/app/library/view');

      // separate states
      $stateProvider
        .state('app', {
          url: '/app',
          abstract: true,
          templateUrl: './templates/shell.html',
          controller: 'ShellController as ctl'
        });
    });

  var ShellController = require('./scripts/ShellController');
  var PouchDBService = require('./scripts/PouchDBService');

  var ActivityModule = require('./modules/activities/ActivityModule');
  var IncidentModule = require('./modules/incidents/IncidentModule');
  var LibraryModule = require('./modules/library/LibraryModule');

  angular.module('inspectApp').service('PouchDBService', [PouchDBService]);
  angular.module('inspectApp').controller('ShellController', ['$mdSidenav', '$scope', '$log', '$q', ShellController]);

  var activityModule = new ActivityModule();
  activityModule.initialize();

  var incidentModule = new IncidentModule();
  incidentModule.initialize();

  var libraryModule = new LibraryModule();
  libraryModule.initialize();

})();
