(function() {

  'use strict';

  angular.module('inspectApp').controller('LogController', ['$state', '$log', '$q', 'AuditService', LogController]);

  function LogController($state, $log, $q, AuditService) {

    var self = this;
    self.events = [];

    self.initialize = function() {

      $q.when(AuditService.initialize())
        .then(
          $q.when(AuditService.events())
            .then(function(events) {
              events.rows.map(function(event) {
                var evt = event.doc;
                var direction = ( self.events % 2 == 0 ? 'left' : 'right' );
                evt.direction = direction;
                self.events.push(evt);
              });
            })
          );
    };
  };

})();
