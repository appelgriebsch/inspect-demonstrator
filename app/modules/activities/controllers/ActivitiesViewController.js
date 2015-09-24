(function() {

  'use strict';

  function ActivitiesViewController($state, $log, $q, ActivityDataService) {

    this.events = [];

    this.initialize = function() {

      $q.when(ActivityDataService.initialize())
        .then(
          $q.when(ActivityDataService.events())
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

  module.exports = ActivitiesViewController;

})();
