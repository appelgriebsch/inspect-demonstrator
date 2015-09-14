(function() {

  'use strict';

  angular.module('inspectApp', ['ngMaterial', 'ngSanitize', 'ui.router'])
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
