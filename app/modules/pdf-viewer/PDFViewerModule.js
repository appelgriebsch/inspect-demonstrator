(function() {

  'use strict';

  function PDFViewerModule() {

    var ipc = require('ipc');
    var browserWindow = require('browser-window');

    var _window = new browserWindow({
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
      resizable: false,
      'skip-taskbar': true,
      show: false,
      'accept-first-mouse': false,
      'enable-larger-than-screen': true
    });

    _window.loadUrl('file://' + __dirname + '/views/pdfviewer.html');

    var _close = function() {
      if (_window) {
        _window.close();
        _window = null;
      }
    };

    var callback;

    ipc.on('analyze-pdf-finished', function(event, result) {
      result._id = result.id;      
      callback.resolve(result);
      callback = null;
    });

    var _preview = function(file) {

      var promise = new Promise((resolve, reject) => {

        callback = {
          resolve: resolve,
          reject: reject
        };

        _window.webContents.send('analyze-pdf', file);
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
