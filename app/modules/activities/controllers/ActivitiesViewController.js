(function() {

  'use strict';

  function ActivitiesViewController($scope, $state, $q, ActivityDataService) {

    this.events = [];

    this.initialize = function() {

      var init = [ActivityDataService.initialize()];

      Promise.all(init).then(() => {
        return ActivityDataService.events();
      }).then((events) => {
        events.rows.map((event) => {
          var evt = event.doc;
          var direction = (this.events.length % 2 == 0 ? 'left' : 'right');
          evt.direction = direction;
          this.events.push(evt);
        });
      });
    };
  }

  module.exports = ActivitiesViewController;

})();
