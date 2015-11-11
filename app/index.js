(function() {

  'use strict';

  var app = require('app');
  var ipc = require('ipc');

  var path = require('path');
  var os = require('os');
  var fs = require('fs');

  var BrowserWindow = require('browser-window');

  // initialize service finder module
  var ServiceFinder = require('node-servicefinder').ServiceFinder;

  const dataDir = app.getPath('userData') + path.sep;
  const cacheDir = app.getPath('userCache') + path.sep;
  const tempDir = app.getPath('temp') + path.sep;
  const homeDir = app.getPath('home') + path.sep;
  const hostname = os.hostname();
  const username = (process.platform === 'win32') ? process.env.USERNAME : process.env.USER;

  // report crashes to the Electron project
  require('crash-reporter').start();

  // adds debug features like hotkeys for triggering dev tools and reload
  require('electron-debug')();

  // create main application window
  function createMainWindow() {

    var win = new BrowserWindow({
      width: 1280,
      height: 800,
      frame: false
    });

    win.loadUrl('file://' + __dirname + '/main.html');
    win.on('close', onClosed);

    return win;
  }

  function onClosed() {
    // deref the window
    // for multiple windows store them in an array
    mainWindow = null;
  }

  var handleStartupEvent = function() {

    if (process.platform !== 'win32') {
      return false;
    }

    var cp = require('child_process');
    var path = require('path');
    var updateDotExe = path.resolve(path.dirname(process.execPath), '..', 'update.exe');
    var target = path.basename(process.execPath);

    var squirrelCommand = process.argv[1];
    switch (squirrelCommand) {
      case '--squirrel-install':
      case '--squirrel-updated':

        // Optionally do things such as:
        //
        // - Install desktop and start menu shortcuts
        // - Add your .exe to the PATH
        // - Write to the registry for things like file associations and
        //   explorer context menus

        // create shortcuts
        cp.spawnSync(updateDotExe, ['--createShortcut', target], {
          detached: true
        });

        // Always quit when done
        app.quit();
        return true;

      case '--squirrel-uninstall':
        // Undo anything you did in the --squirrel-install and
        // --squirrel-updated handlers

        cp.spawnSync(updateDotExe, ['--removeShortcut', target], {
          detached: true
        });

        // Always quit when done
        app.quit();
        return true;

      case '--squirrel-obsolete':
        // This is called on the outgoing version of your app before
        // we update to the new version - it's the opposite of
        // --squirrel-updated
        app.quit();
        return true;
    }
  };

  // check if we are being called by insaller routine
  if (handleStartupEvent()) {
    return;
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
  });

  app.serviceFinder = function(serviceName, protocol, subTypes, includeLocal) {
    return new ServiceFinder(serviceName, protocol, subTypes, includeLocal);
  };

  app.sysConfig = function() {
    return {
      host: hostname,
      platform: process.platform,
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

  app.close = function() {
    if (mainWindow) {
      mainWindow.close();
    }
    app.quit();
  };

  app.toggleFullscreen = function() {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  };

  var webAnalyzer = fs.readFileSync(path.join(__dirname, 'scripts', 'webanalyzer.js'));

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

  var pdfAnalyzer = fs.readFileSync(path.join(__dirname, 'scripts', 'pdfanalyzer.js'));

  app.createPDFPreview = function(url) {

    var promise = new Promise((resolve, reject) => {

      var pdfPreviewWnd = new BrowserWindow({
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

      pdfPreviewWnd.loadUrl(`file://${__dirname}/templates/pdfanalyzer.html?pdf=${url}`);

      ipc.on('analyze-pdf-result', (evt, result) => {
        if (result.url === url) {
          pdfPreviewWnd.destroy();
          resolve(result);
        }
      });

      pdfPreviewWnd.webContents.on('dom-ready', () => {
        pdfPreviewWnd.webContents.executeJavaScript(pdfAnalyzer.toString());
      });
    });

    return promise;
  };
})();
