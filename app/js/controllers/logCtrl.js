(function() {

  'use strict';

  angular.module('inspectApp').controller('LogController', ['$state', '$log', '$q', 'LogService', LogController]);

  function LogController($state, $log, $q, LogService) {

    this.events = [];

    this.initialize = function() {

      $q.when(LogService.initialize())
        .then(
          $q.when(LogService.events())
          .then((events) => {
            events.rows.map((event) => {
              var evt = event.doc;
              var direction = (this.events.length % 2 == 0 ? 'left' : 'right');
              evt.direction = direction;
              this.events.push(evt);
            });
          })
        );
    };
  }

})();
