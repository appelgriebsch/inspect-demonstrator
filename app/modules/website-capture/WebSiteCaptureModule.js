(function() {

  'use strict';

  function WebSiteCaptureModule() {

    var ipc = require('ipc');
    var app = require('app');
    var browserWindow = require('browser-window');

    var filenamifyUrl = require('filenamify-url');
    var pageres = require('pageres');

    var _initializeCaptureWindow = function(display) {

      var promise = new Promise((resolve, reject) => {

        var _window = new browserWindow({
          x: display.width,
          y: display.height,
          width: display.width,
          height: display.height,
          resizable: false,
          'skip-taskbar': true,
          show: true,
          'accept-first-mouse': false,
          'enable-larger-than-screen': true
        });

        _window.loadUrl('file://' + __dirname + '/views/capture.html');
        _window.webContents.on('did-finish-load', () => {
          resolve(_window);
        });
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

        var localScreen = require('screen');
        var display = localScreen.getPrimaryDisplay().workAreaSize;

        _initializeCaptureWindow(display).then((_window) => {

          _window.webContents.send('capture-page', JSON.stringify({
            url: uri,
            name: filenamifyUrl(uri)
          }));

          ipc.on('capture-finished', function(event, result) {

            if (_window) {
              var site = JSON.parse(result);
              _window.capturePage(function(preview) {
                site.preview = preview.toDataUrl();
                _window.destroy();
                _window = null;
                resolve(site);
              });
            }
          });

          ipc.on('capture-error', function(event, result) {
            reject(result);
          });

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
