(function() {

  'use strict';

  function DocumentCaptureService($http) {

    var _isWebResource = function(uri) {

      var r = /^(ftp|http|https):\/\/[^ "]+$/;
      return r.test(uri);
    }

    var _captureImage = function(uri) {

      var promise = new Promise((resolve, reject) => {

        if (_isWebResource(uri)) {

          $http.get(uri).then((result) => {
            console.log(result);
            resolve(result);
          });
        }

      });

      return promise;
    };

    var _capturePDF = function(uri) {

      var promise = new Promise((resolve, reject) => {

        if (_isWebResource(uri)) {

          $http.get(uri).then((result) => {
            console.log(result);
            resolve(result);
          });
        }

      });

      return promise;
    };

    var _captureWebSite = function(url) {

      var promise = new Promise((resolve, reject) => {

        if (_isWebResource(url)) {

          $http.get(url).then((result) => {
            console.log(result);
            resolve(result);
          });
        }
      });

      return promise;
    };

    return {

      captureWebSite: _captureWebSite,
      capturePDF: _capturePDF,
      captureImage: _captureImage
    };
  }

  module.exports = DocumentCaptureService;

})();
