(function() {

  'use strict';

  function ActivitiesViewController($state, $log, $q, ActivityService) {

    this.events = [];

    this.initialize = function() {

      $q.when(ActivityService.initialize())
        .then(
          $q.when(ActivityService.events())
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
