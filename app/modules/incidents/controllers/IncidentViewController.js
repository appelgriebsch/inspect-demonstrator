(function() {

  'use strict';

  function IncidentViewController($scope, $state, $q, IncidentDataService) {

    this.items = [];

    this.initialize = function() {
      var init = [IncidentDataService.initialize()];
      Promise.all(init).then(() => {
        return IncidentDataService.incidents();
      }).then((result) => {
        $q.when(true).then(() => {
          result.rows.forEach((item) => {
            this.items.push(item.doc);
          });
        });
      });
    };
  }

  module.exports = IncidentViewController;

})();
