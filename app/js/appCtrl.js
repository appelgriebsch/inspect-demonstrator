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

  angular.module('inspectApp').controller('AppController', ['$mdSidenav', '$log', '$q', AppController]);

  function AppController($mdSidenav, $log, $q) {

    var self = this;

    self.initialize = function() {
      // TODO: initialization code
    }

    self.toggleSidebar = function() {
      var pending = $q.when(true);
      pending.then(function() {
        $mdSidenav('sidebar').toggle();
      });
    }
  };
})();
