(function() {

  'use strict';

  angular.module('inspectApp', ['ngMaterial', 'ngSanitize', 'angular-timeline', 'ui.router', 'angular-centered', 'notification'])
    .config(function($mdThemingProvider) {
      $mdThemingProvider.theme('default')
        .primaryPalette('blue-grey')
        .accentPalette('grey');
    })
    .config(function($notificationProvider) {
      $notificationProvider.setOptions({
        icon: __dirname + '/assets/demonstrator.png'
      });
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
          templateUrl: './templates/shell.html',
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

  var ShellController = require('./scripts/ShellController');
  var PouchDBService = require('./scripts/PouchDBService');
  var ModuleProvider = require('./scripts/ModuleProvider');

  // hint: has to initialize modules here, otherwise controller objects are not found :(
  ModuleProvider.loadModules();

  angular.module('inspectApp').service('PouchDBService', [PouchDBService]);
  angular.module('inspectApp').provider('modules', [ModuleProvider]);

  angular.module('inspectApp').controller('ShellController', ['$mdSidenav', '$scope', '$log', '$q', 'modules', ShellController]);

})();
