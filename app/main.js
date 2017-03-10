(function(angular) {

  'use strict';

  angular.module('electron-app', ['ngMaterial', 'ngSanitize', 'ui.router', 'ngAnimate', 'angular-timeline', 'angular-centered', 'ui.tree'])
    .config(function($mdThemingProvider) {
      $mdThemingProvider.theme('default')
        .primaryPalette('blue-grey')
        .accentPalette('grey');
    })
    .config(function($stateProvider, $urlRouterProvider) {

      var appcfg = require('./appcfg');
      var defaultRoute = appcfg.modules[appcfg.defaultModule].url;

      // for all unmatched entries
      $urlRouterProvider.otherwise(defaultRoute);

      // separate states
      $stateProvider
        .state('app', {
          url: '/app',
          abstract: true,
          templateUrl: './shell/views/shell.html',
          controller: 'ShellController as shell'
        });
    })
    .run(['$rootScope', '$state', '$stateParams',
      function($rootScope, $state, $stateParams) {
        // It's very handy to add references to $state and $stateParams to the $rootScope
        // so that you can access them from any scope within your applications.For example,
        // <li ng-class="{ active: $state.includes('contacts.list') }"> will set the <li>
        // to active whenever 'contacts.list' or one of its decendents is active.
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
      }
    ]);

  const PouchDBService = require('./shell/services/PouchDBService');
  const ActivityDataService = require('./shell/services/ActivityDataService');
  const ActivityService = require('./shell/services/ActivityService');

  const LevelGraphService = require('./shell/services/LevelGraphService');

  const OntologyDataService = require('./shell/services/OntologyDataService');

  const ModuleProvider = require('./scripts/ModuleProvider');
  const ShellController = require('./shell/controllers/ShellController');

  // hint: has to initialize modules here, otherwise controller objects are not found :(
  ModuleProvider.loadModules();

  angular.module('electron-app').provider('modules', [ModuleProvider]);

  angular.module('electron-app').service('PouchDBService', [PouchDBService]);
  angular.module('electron-app').service('ActivityDataService', ['PouchDBService', ActivityDataService]);
  angular.module('electron-app').service('ActivityService', ['ActivityDataService', ActivityService]);

  angular.module('electron-app').service('LevelGraphService', [LevelGraphService]);
  angular.module('electron-app').service('OntologyDataService', ['LevelGraphService', OntologyDataService]);

  angular.module('electron-app').controller('ShellController', ['$scope', '$log', '$q', '$mdSidenav', 'modules', 'ActivityService', ShellController]);

})(global.angular);
