(function() {

  'use strict';

  var app = require('app');
  var BrowserWindow = require('browser-window');

  // report crashes to the Electron project
  require('crash-reporter').start();

  // adds debug features like hotkeys for triggering dev tools and reload
  require('electron-debug')();

  // create main application window
  function createMainWindow() {

    var win = new BrowserWindow({
      width: 1024,
      height: 768,
      resizable: true
    });

    win.loadUrl('file://' + __dirname + '/main.html');
    win.on('closed', onClosed);

    return win;
  }

  function onClosed() {
    // deref the window
    // for multiple windows store them in an array
    mainWindow = null;

    if (pdfViewerService) {
      pdfViewerService.close();
    }
  }

  // prevent window being GC'd
  var mainWindow;

  app.on('window-all-closed', function() {
    app.quit();
  });

  app.on('activate-with-no-open-windows', function() {
    if (!mainWindow) {
      mainWindow = createMainWindow();
    }
  });

  app.on('ready', function() {
    mainWindow = createMainWindow();
    pdfViewerService = new PDFViewer();
  });

  // initialize service finder module
  var ServiceFinder = require('node-servicefinder').ServiceFinder;
  var PDFViewer = require('./modules/pdf-viewer/PDFViewerModule');

  var path = require('path');
  var os = require('os');
  var fs = require('fs');

  const dataDir = app.getPath('userData') + path.sep;
  const cacheDir = app.getPath('userCache') + path.sep;
  const tempDir = app.getPath('temp') + path.sep;
  const homeDir = app.getPath('home') + path.sep;
  const hostname = os.hostname();
  const username = (process.platform === 'win32') ? process.env.USERNAME : process.env.USER;

  var pdfViewerService;

  app.serviceFinder = function(serviceName, protocol, subTypes, includeLocal) {
    return new ServiceFinder(serviceName, protocol, subTypes, includeLocal);
  };

  app.sysConfig = function() {
    return {
      host: hostname,
      user: username,
      paths: {
        home: homeDir,
        temp: tempDir,
        data: dataDir,
        cache: cacheDir
      }
    };
  };

  app.getMainWindow = function() {
    return mainWindow;
  };

  app.pdfViewerService = function() {
    return pdfViewerService;
  };

  app.snapshotWebSite = function(url) {

    var promise = new Promise((resolve, reject) => {

      var webWnd = new BrowserWindow({
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

      webWnd.loadUrl(url);

      webWnd.webContents.on('dom-ready', () => {
        webWnd.capturePage(function(thumbnail) {
          var tempPath = app.getPath('temp');
          var filenamifyUrl = require('filenamify-url');
          var rm = require('rimraf');
          var fileName = filenamifyUrl(url);
          webWnd.webContents.savePage(path.join(tempPath, fileName), 'MHTML', function(err) {
            if (err) {
              reject(err);
            } else {
              var archive = fs.readFileSync(path.join(tempPath, fileName));
              webWnd.destroy();
              rm(path.join(tempPath, fileName), () => {
                resolve({
                  id: fileName,
                  content_type: 'application/x-mimearchive',
                  preview: thumbnail.toDataUrl(),
                  data: archive
                });
              });
            }
          });
        });
      });
    });

    return promise;
  };

})();
