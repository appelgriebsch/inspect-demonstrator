(function() {

  'use strict';

  angular.module('inspectApp').controller('LogController', ['$state', '$log', '$q', 'AuditService', LogController]);

  function LogController($state, $log, $q, AuditService) {

    var self = this;
    self.events = [];

    self.initialize = function() {

      $q.when(AuditService.events())
        .then(function(events) {
          events.rows.map(function(event) {
            self.events.push(event.doc);
          });
        });
    };
  };

})();
