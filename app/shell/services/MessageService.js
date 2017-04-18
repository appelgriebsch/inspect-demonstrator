(function() {

  'use strict';

  function MessageService($rootScope) {
    const events = ['set-busy-event', 'set-ready-event', 'set-error-event'];

    const _isEventHandled = (event) => {
      return (events.indexOf(event) > -1);
    };

    return {
      setBusy: (msg) => {
        $rootScope.$emit('set-busy-event', {msg: msg});
      },
      setError: (template, icon, error) => {
        $rootScope.$emit('set-error-event', {template: template, icon: icon, error: error});
      },
      setReady: (dirty) => {
        $rootScope.$emit('set-ready-event', {dirty: dirty} );
      },
      subscribe: function(scope, event, callback) {
        if (_isEventHandled(event) !== true) {
          //TODO: throw error
          return;
        }
        const handler = $rootScope.$on(event, callback);
        scope.$on('$destroy', handler);
      },
    };
  }

  module.exports = MessageService;

})();
