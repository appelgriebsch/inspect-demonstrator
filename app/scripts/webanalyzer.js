(function() {

  'use strict';

  var _getParameterByName = function(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
  };

  var _disableInternalLinks = function() {
    var links = document.querySelectorAll('a[href]');
    for (var link in links) {
      links[link].href='javascript:void(0)';
    }
  };

  _disableInternalLinks();
  
})();
