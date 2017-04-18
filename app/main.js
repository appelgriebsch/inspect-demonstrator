(function(angular) {

  'use strict';

  angular.module('electron-app', ['ngMaterial', 'ngSanitize', 'ui.router', 'ngAnimate', 'angular-timeline', 'angular-centered', 'ui.tree'])
    .config(function($mdThemingProvider) {
      $mdThemingProvider.theme('default')
        .primaryPalette('blue-grey')
        .accentPalette('grey');
    })
    .config(function($stateProvider, $urlRouterProvider) {

      const appcfg = require('./appcfg');
      // for all unmatched entries
      $urlRouterProvider.otherwise('/otherwise');

      // separate states
      $stateProvider
        .state('app', {
          url: '/app',
          abstract: true,
          templateUrl: './shell/views/shell.html',
          controller: 'ShellController as shell',
        })
        .state('otherwise', {
          url: "/otherwise",
          redirectTo: appcfg.modules[appcfg.defaultModule].state
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

        // making redirectTo work with angular-ui-router 0.4.x
        $rootScope.$on('$stateChangeStart', function (event, toState) {
          const redirect = toState.redirectTo;
          if (redirect) {
            event.preventDefault();
            $state.go(redirect);
          }
        });

      }
    ]);

  const PouchDBService = require('./shell/services/PouchDBService');
  const ActivityDataService = require('./shell/services/ActivityDataService');
  const ActivityService = require('./shell/services/ActivityService');

  const LevelGraphService = require('./shell/services/LevelGraphService');

  const OntologyDataService = require('./shell/services/OntologyDataService');

  const MessageService = require('./shell/services/MessageService');

  const ModuleProvider = require('./scripts/ModuleProvider');
  const ShellController = require('./shell/controllers/ShellController');

  // hint: has to initialize modules here, otherwise controller objects are not found :(
  ModuleProvider.loadModules();

  angular.module('electron-app').provider('modules', [ModuleProvider]);

  angular.module('electron-app').service('PouchDBService', [PouchDBService]);
  angular.module('electron-app').service('ActivityDataService', ['PouchDBService', ActivityDataService]);
  angular.module('electron-app').service('ActivityService', ['ActivityDataService', ActivityService]);

  angular.module('electron-app').service('LevelGraphService', [LevelGraphService]);
  angular.module('electron-app').service('MessageService', ['$rootScope', MessageService]);
  angular.module('electron-app').service('OntologyDataService', ['LevelGraphService', OntologyDataService]);

  angular.module('electron-app').controller('ShellController', ['$scope', '$log', '$q', '$mdSidenav', 'modules', 'ActivityService', 'MessageService', ShellController]);


})(global.angular);
