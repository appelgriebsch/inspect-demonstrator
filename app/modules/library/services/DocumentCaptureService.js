(function() {

  'use strict';

  function DocumentCaptureService($http) {

    var remote = require('remote');
    var app = remote.require('app');

    var path = require('path');
    var fs = require('fs');

    var _isWebResource = function(uri) {

      var r = /^(ftp|http|https):\/\/[^ "]+$/;
      return r.test(uri);
    };

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

    var _requestFileData = function(uri) {

      var promise = new Promise((resolve, reject) => {

        if (_isWebResource(uri.url)) {
          $http.get(uri.url).then((result) => {
            resolve(result);
          }).catch((err) => {
            reject(err);
          });
        } else {
          fs.readFile(uri.path, (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        }
      });

      return promise;
    };

    var _capturePDF = function(req) {

      var promise = new Promise((resolve, reject) => {

        app.createPDFPreview(req.url).then((result) => {

          result.type = 'document';
          result.id = path.basename(req.name, path.extname(req.name));
          result.title = result.title || result.id;
          result.attachment = {
            id: result.title,
            content_type: req.mime
          };
          resolve(result);

        }).catch((err) => {
          reject(err);
        });
      });

      return promise;
    };

    var _captureWebSite = function(url) {

      var promise = new Promise((resolve, reject) => {

        if (_isWebResource(url)) {
          app.snapshotWebSite(url).then((result) => {
            resolve(result);
          }).catch((err) => {
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
      captureImage: _captureImage,
      requestFileData: _requestFileData
    };
  }

  module.exports = DocumentCaptureService;

})();
