(function(angular) {

  'use strict';

  function OntologyViewController($scope, $state, $q, $mdDialog, OntologyDataService) {

    this.state = $state.$current;
    this.baseState = this.state.parent.toString();

    this.initialize = function() {

      var init = [OntologyDataService.initialize()];
      Promise.all(init).then(() => {
        return OntologyDataService.node('http://www.AMSL/GDK/ontologie#Skimmer');
      }).then((results) => {
        $q.when(true).then(() => {
          console.log(results);
        });
      });
    };
  }

  module.exports = OntologyViewController;

})(global.angular);
