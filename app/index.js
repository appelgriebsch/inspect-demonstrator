(function() {

  'use strict';

  const electron = require('electron');
  const electronDevTools = require('electron-devtools-installer')

  const app = electron.app;
  const ipc = electron.ipcMain;

  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const BrowserWindow = electron.BrowserWindow;
  const Tray = electron.Tray;

  // initialize service finder module
  const ServiceFinder = require('node-servicefinder').ServiceFinder;

  const appName = app.getName();
  const appVersion = app.getVersion();
  const dataDir = app.getPath('userData') + path.sep;
  const cacheDir = app.getPath('userCache') + path.sep;
  const tempDir = app.getPath('temp') + path.sep;
  const homeDir = app.getPath('home') + path.sep;
  const hostname = os.hostname();
  const username = (process.platform === 'win32') ? process.env.USERNAME : process.env.USER;

  // report crashes to the Electron project
  // require('crash-reporter').start();

  // adds debug features like hotkeys for triggering dev tools and reload
  require('electron-debug')()
  process.on('uncaughtException', onCrash)
  // add this switch for the notification window
  app.commandLine.appendSwitch('--enable-transparent-visuals')

  // create main application window
  function createMainWindow() {

    var win = new BrowserWindow({
      width: 1280,
      height: 800,
      frame: false
    });

    win.loadURL('file://' + __dirname + '/main.html');
    win.on('closed', onClosed);
    win.webContents.on('crashed', onCrash);
    win.on('unresponsive', onCrash);
    return win;
  }

  function onClosed() {
    // deref the window
    // for multiple windows store them in an array
    mainWindow = null;
  }

  function onCrash(exc) {
    console.log(exc);
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
  var trayIcon;

  app.on('activate', function() {
    if (!mainWindow) {
      mainWindow = createMainWindow();
    }
  });

  app.on('ready', function() {
    mainWindow = createMainWindow();
    const isDev = require('electron-is-dev')
    if (isDev) {
      electronDevTools.default(electronDevTools.ANGULARJS_BATARANG);
    }
  });

  app.serviceFinder = function(serviceName, protocol, subTypes, includeLocal) {
    return new ServiceFinder(serviceName, protocol, subTypes, includeLocal);
  };

  app.sysConfig = function() {
    return {
      app: {
        name: appName,
        version: appVersion
      },
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

  app.minimizeAppToSysTray = function() {

    trayIcon = new Tray(path.join(__dirname, 'assets', 'demonstrator_tray.png'));
    trayIcon.setToolTip('App is running in background mode.');
    trayIcon.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        trayIcon.destroy();
      }
    });
    if (mainWindow) {
      mainWindow.hide();
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

      webWnd.loadURL(url);

      webWnd.on('unresponsive', (err) => {
        console.log(err);
        reject(err.message);
      });

      webWnd.webContents.on('crashed', (err) => {
        console.log(err);
        reject(err.message);
      });

      webWnd.webContents.on('dom-ready', () => {
        webWnd.webContents.executeJavaScript(webAnalyzer.toString());
      });

      webWnd.webContents.on('did-finish-load', () => {
        webWnd.capturePage(function(thumbnail) {
          var tempPath = app.getPath('temp');
          var filenamifyUrl = require('filenamify-url');
          var rm = require('rimraf');
          var fileName = filenamifyUrl(url);
          var tmpArchive = path.join(tempPath, fileName).substr(0, 200) + '.mhtml';
          webWnd.webContents.savePage(tmpArchive, 'MHTML', function(err) {
            if (err) {
              reject(err);
            } else {
              fs.readFile(tmpArchive, (err, archive) => {
                if (err) {
                  reject(err);
                }
                else {
                  webWnd.destroy();
                  rm(tmpArchive, () => {
                    resolve({
                      id: fileName,
                      content_type: 'application/x-mimearchive',
                      preview: thumbnail.toDataURL(),
                      data: archive
                    });
                  });
                }
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

      pdfPreviewWnd.loadURL(`file://${__dirname}/templates/pdfanalyzer.html?pdf=${url}`);

      pdfPreviewWnd.on('unresponsive', (err) => {
        console.log(err);
        reject(err.message);
      });

      pdfPreviewWnd.webContents.on('crashed', (err) => {
        console.log(err);
        reject(err.message);
      });

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
