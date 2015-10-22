(function() {

  'use strict';

  function DocumentCaptureService($http) {

    var remote = require('remote');
    var app = remote.require('app');

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
          app.snapshotWebSite(url).then((result) => {
            resolve(result);
          })
          .catch((err) => {
            reject(err);
          });
        } else {
          reject(`${url} is not a valid web resource!`);
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
