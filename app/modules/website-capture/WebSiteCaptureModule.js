(function() {

  'use strict';

  function WebSiteCaptureModule() {

    var ipc = require('ipc');
    var app = require('app');
    var browserWindow = require('browser-window');

    var fs = require('fs');
    var path = require('path');
    var pageres = require('pageres');

    var _window = null;
    var _width, _height;

    var _initialize = function() {

      var localScreen = require('screen');
      var display = localScreen.getPrimaryDisplay().workAreaSize;

      var promise = new Promise((resolve, reject) => {

        _width = display.width;
        _height = display.height;

        if (_window === null) {
          _window = new browserWindow({
            x: display.width,
            y: display.height,
            width: display.width,
            height: display.height,
            resizable: false,
            'skip-taskbar': true,
            show: true,
            'enable-larger-than-screen': true
          });

          _window.loadUrl('file://' + __dirname + '/views/capture.html');
          _window.webContents.on('did-finish-load', () => {
            resolve();
          });
        }
      });

      return promise;
    };

    var _capturePage = function(uri) {

      var promise = new Promise((resolve, reject) => {

        var capturePage = new pageres({
          delay: 2,
          filename: '<%= date %>.<%= url %>'
        }).src(uri, [_width + 'x' + _height])
          .dest(app.getPath('temp'));

        capturePage.run(function(err, results) {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      });

      return promise;
    };

    var _capturePreview = function(uri) {

      var promise = new Promise((resolve, reject) => {

        _initialize().then(() => {

          ipc.on('capture-finished', function(event, result) {

            var site = JSON.parse(result);
            _window.capturePage(function(preview) {
              site.preview = preview.toDataUrl();
              _window.close();
              _window = undefined;
              resolve(site);
            });
          });

          ipc.on('capture-error', function(event, result) {
            reject(result);
          });

          _window.webContents.send('capture-page', JSON.stringify({
            url: uri,
            name: "ABC.png"
          }));
        });
      });
      return promise;
    };

    return {

      capturePage: _capturePage,
      capturePreview: _capturePreview
    };
  }

  module.exports = WebSiteCaptureModule;

})();
