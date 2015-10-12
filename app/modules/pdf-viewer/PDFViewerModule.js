(function() {

  'use strict';

  function PDFViewerModule() {

    var ipc = require('ipc');
    var browserWindow = require('browser-window');

    var localScreen = require('screen');
    var display = localScreen.getPrimaryDisplay().workAreaSize;

    var _window = new browserWindow({
      x: display.width,
      y: display.height,
      width: display.width,
      height: display.height,
      resizable: false,
      'skip-taskbar': true,
      show: false,
      'accept-first-mouse': false,
      'enable-larger-than-screen': true
    });

    _window.loadUrl('file://' + __dirname + '/views/pdfviewer.html');
    _window.showInactive();

    var _close = function() {
      if (_window) {
        _window.close();
        _window = null;
      }
    };

    var callback;

    ipc.on('capture-pdf-finished', function(event, result) {
      callback.resolve(result);
      callback = null;
    });

    var _preview = function(file) {

      var promise = new Promise((resolve, reject) => {

        callback = {
          resolve: resolve,
          reject: reject
        };

        _window.webContents.send('capture-pdf', file);
      });

      return promise;
    };

    return {

      preview: _preview,
      close: _close
    };
  }

  module.exports = PDFViewerModule;

})();
