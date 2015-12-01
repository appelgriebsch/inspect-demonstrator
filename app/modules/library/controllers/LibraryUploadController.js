(function(angular) {

  'use strict';

  function LibraryUploadController($scope, $state, $q, DocumentCaptureService, LibraryDataService) {

    var dropZone, fileSelector;
    this.document = {
      tags: [],
      files: []
    };

    $scope.$on('submit', (evt, args) => {

      $scope.setBusy('Uploading Files...');
      var p = [];

      this.document.files.forEach((file) => {

        var fp = DocumentCaptureService.requestFileData(file).then((data) => {

          var _attachments = this.document._attachments || {};
          _attachments[this.document.meta.name] = {
            content_type: file.mime,
            data: data
          };

          this.document._attachments = _attachments;

        }).catch((err) => {
          $scope.setError('AddAction', 'file_upload', err);
          $scope.setReady(true);
        });

        p.push(fp);

      });

      Promise.all(p).then((results) => {

        delete this.document.files;

        return LibraryDataService.save(this.document).then((result) => {

          var info = $scope.createEventFromTemplate('AddAction', 'file_upload');
          info.description = `Document <i>${this.document.meta.name}</i> created successfully!`;
          info.object = this.document.meta;
          delete info.result;

          $scope.writeLog('info', info).then(() => {
            $scope.notify('Document created successfully', info.description);
            this.document = null;
            $scope.setReady(true);
            $state.go('^.view');
          });
        }).catch((err) => {
          $scope.setError('AddAction', 'file_upload', err);
          $scope.setReady(true);
        });
      });
    });

    $scope.$on('cancel', () => {
      $q.when(true).then(() => {
        this.document = {};
        $scope.setReady(false);
        $state.go('^.view');
      });
    });

    this.initialize = function() {

      var init = [LibraryDataService.initialize()];

      dropZone = document.getElementById('dropZone');

      if (dropZone) {

        dropZone.ondragover = (e) => {
          e.dataTransfer.dropEffect = 'copy';
          return false;
        };

        dropZone.ondragleave = dropZone.ondragend = function() {
          return false;
        };

        dropZone.ondrop = (e) => {
          e.preventDefault();
          var files = e.dataTransfer.files;
          $q.when(true).then(() => {
            this.addFiles(files);
          });
          return false;
        };
      }

      return Promise.all(init);
    };

    this.showFileSelector = function() {

      if (!fileSelector) {

        fileSelector = document.getElementById('fileSelector');

        fileSelector.onchange = (e) => {
          $q.when(true).then(() => {
            this.addFiles(e.target.files);
          });
        };
      }

      $q.when(true).then(() => {
        fileSelector.click();
      });
    };

    this.addFiles = function(files) {

      var newRequests = [];

      for (var i = 0; i < files.length; ++i) {
        var file = files[i];
        var uploadRequest = {
          name: file.name,
          mime: file.type,
          size: file.size,
          path: file.path,
          url: `file:///${file.path}`
        };
        newRequests.push(uploadRequest);
        this.document.files.push(uploadRequest);
      }

      $scope.setBusy('Analyzing document...');

      DocumentCaptureService.capturePDF(this.document.files[0]).then((meta) => {

        var template = LibraryDataService.createMetadataFromTemplate('book');
        template.author = LibraryDataService.buildAuthorInformation(meta.author || '');

        template.datePublished = meta.publicationDate;
        template.description = meta.description;
        template.headline = meta.title;
        template.keywords = meta.tags ? meta.tags.join(',') : '';
        template.url = meta.url;

        $q.when(true).then(() => {

          this.document.meta = template;
          this.document.status = 'new';
          this.document.tags = template.keywords.split(/\s*,\s*/);

          this.document.meta.name = meta.id;

          this.document.meta.thumbnailUrl.encodingFormat = 'image/png';
          this.document.meta.thumbnailUrl.contentUrl = meta.preview;

          $scope.setReady(true);
        });

      }).catch((err) => {
        $scope.setError('AddAction', 'file_upload', err);
        $scope.setReady(true);
      });
    };
  }

  module.exports = LibraryUploadController;

})(global.angular);
