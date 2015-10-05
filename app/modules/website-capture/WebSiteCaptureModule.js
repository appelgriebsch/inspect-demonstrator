(function() {

  'use strict';

  function WebSiteCaptureModule() {

    var ipc = require('ipc');
    var app = require('app');
    var browserWindow = require('browser-window');

    var path = require('path');
    var fs = require('fs');

    var filenamifyUrl = require('filenamify-url');
    var pageres = require('pageres');

    var localScreen = require('screen');
    var display = localScreen.getPrimaryDisplay().workAreaSize;

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
    _window.showInactive();

    var resolver;

    ipc.on('capture-finished', function(event, result) {
      _window.capturePage(function(preview) {
        result.preview = preview.toDataUrl();
        resolver(result);
        resolver = null;
      });
    });

    var _capturePage = function(uri) {

      var promise = new Promise((resolve, reject) => {

        var tempPath = app.getPath('temp');
        var capturePage = new pageres({
          delay: 2,
          filename: '<%= date %>.<%= url %>'
        })
        .src(uri, [display.width + 'x' + display.height])
        .dest(tempPath);

        capturePage.run(function(err, results) {
          if (err) {
            reject(err);
          } else {
            var name = results[0].filename;
            var file = path.join(tempPath, name);
            var pageImg = fs.readFileSync(file);
            resolve({
              url: uri,
              name: name,
              type: 'image/png',
              content: pageImg
            });
          }
        });
      });

      return promise;
    };

    var _capturePreview = function(uri) {

      var promise = new Promise((resolve, reject) => {

        resolver = resolve;
        _window.webContents.send('capture-page', {
          url: uri,
          name: filenamifyUrl(uri)
        });
      });
      return promise;
    };

    var _close = function() {
      if (_window) {
        _window.close();
        _window = null;
      }
    };

    return {

      capturePage: _capturePage,
      capturePreview: _capturePreview,
      close: _close
    };
  }

  module.exports = WebSiteCaptureModule;

})();
