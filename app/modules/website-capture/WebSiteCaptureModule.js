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

    var asar = require('asar');
    var scraper = require('website-scraper');
    var rm = require('rimraf');

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

    _window.loadUrl('file://' + __dirname + '/views/capture.html');

    var callback;

    ipc.on('capture-site-finished', function(event, result) {
      _window.capturePage(function(preview) {
        result.preview = preview.toDataUrl();
        result._id = result.canonicalID;
        callback.resolve(result);
        callback = null;
      });
    });

    var _capturePage = function(uri) {

      var promise = new Promise((resolve, reject) => {

        var tempPath = app.getPath('temp');
        var capturePage = new pageres({
          delay: 2,
          filename: '<%= date %>.<%= url %>'
        })
        .src(uri, [1280 + 'x' + 720])
        .dest(tempPath);

        capturePage.run(function(err, results) {
          if (err) {
            reject(err);
          }
          else {
            var name = results[0].filename;
            var file = path.join(tempPath, name);
            var pageImg = fs.readFileSync(file);
            var capturePath = path.join(tempPath, name.substr(0, name.lastIndexOf('.')));
            scraper.scrape({
              urls: [uri],
              directory: capturePath
            }).then(function (result) {
              fs.writeFileSync(path.join(capturePath, 'site.json'), JSON.stringify(result[0]));
              var asarFile = path.join(tempPath, 'site.archive');
              asar.createPackage(capturePath, asarFile, function(err) {
                if (err) {
                  reject(err);
                }

                var archive = fs.readFileSync(asarFile);

                fs.unlinkSync(file);
                fs.unlinkSync(asarFile);

                rm(capturePath, function() {
                  resolve({
                    url: uri,
                    attachments: [{
                      name: 'image',
                      type: 'image/png',
                      content: pageImg
                    },{
                      name: 'archive',
                      type: 'application/asar',
                      content: archive
                    }]
                  });
                });
              });
            });
          }
        });
      });

      return promise;
    };

    var _capturePreview = function(uri) {

      var promise = new Promise((resolve, reject) => {

        callback = {
          resolve: resolve,
          reject: reject
        };

        _window.webContents.send('capture-site', {
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
