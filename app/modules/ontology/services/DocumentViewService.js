(function () {
  'use strict';

  function DocumentViewService () {
    const electron = require('electron');
    const app = electron.remote.app;
    const shell = electron.shell;

    const fs = require('fs');
    const path = require('path');

    const _openFile = (id, attachment) => {
      let extension = '';
      if (attachment.content_type === "application/pdf") {
        extension = '.pdf';
      }
      if (attachment.content_type === "application/x-mimearchive") {
        extension = '.mhtml';
      }

      const fileName = path.join(app.getPath('temp'), `${id}${extension}`);
      fs.writeFileSync(fileName, attachment.data);
      shell.openItem(fileName);
    };


    return {
      openFile: _openFile,
    };
  }

  module.exports = DocumentViewService;
})();
