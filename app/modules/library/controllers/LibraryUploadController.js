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

      this.files.forEach((file) => {

        var fp = DocumentCaptureService.requestFileData(file).then((data) => {

          var attachments = file._attachments || {};
          attachments[file.attachment.id] = {
            content_type: file.attachment.content_type,
            data: data
          };

          file._id = file.title;
          file._attachments = attachments;

          delete file.attachment;
          delete file.path;
          delete file.mime;
          delete file.size;

          return LibraryDataService.save(file).then((result) => {

            var info = angular.copy(file);
            delete info._attachments;
            delete info.preview;

            info._id = result.id;
            info._rev = result.rev;
            info.icon = 'file_upload';
            info.description = `Document <i>${info.title}</i> uploaded successfully!`;

            return $scope.writeLog('info', info);
          });
        }).catch((err) => {
          $scope.setError(err);
        });

        p.push(fp);

      });

      Promise.all(p).then((results) => {
        $scope.notify('Documents created successfully', `${results.length} documents have been uploaded.`);
        this.files = [];
        $scope.setReady(false);
        $state.go('^.view');
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

      dropZone = document.querySelector('#dropZone');

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
          status: 'unknown',
          path: file.path,
          url: `file:///${file.path}`
        };
        newRequests.push(uploadRequest);
        this.document.files.push(uploadRequest);
      }

      $scope.setBusy('Analyzing document...');

      DocumentCaptureService.capturePDF(this.document.files[0]).then((meta) => {

        var template = LibraryDataService.createMetadataFromTemplate('book');
        template.author = LibraryDataService.createMetadataFromTemplate('person');

        delete template.author.description;
        delete template.author.email;
        delete template.author.honorificPrefix;
        delete template.author.honorificSuffix;
        delete template.author.jobTitle;

        var author = meta.author !== undefined ? meta.author.split(/\s*,\s*/) : '';
        if (author.length > 1) {
          template.author.familyName = author[0];
          template.author.givenName = author[1];
          template.author.name = `${author[1]} ${author[0]}`;
        } else {
          author = meta.author.split(' ');
          template.author.name = meta.author;
          if (author.length > 0) {
            template.author.familyName = author[1];
            template.author.givenName = author[0];
          }
          else {
            delete template.author.familyName;
            delete template.author.givenName;
          }
        }

        template.datePublished = meta.publicationDate;
        template.description = meta.description;
        template.headline = meta.title;
        template.keywords = meta.tags.join(',');
        template.url = meta.url;

        console.log(template);

        $q.when(true).then(() => {
          this.document = {
            meta: template,
            status: 'new',
            tags: template.keywords.split(/\s*,\s*/)
          };

          this.document.meta.name = meta.id;

          this.document.meta.thumbnailUrl.encodingFormat = 'image/png';
          this.document.meta.thumbnailUrl.contentUrl = meta.preview;

          $scope.setReady(true);
        });

      }).catch((err) => {
        $scope.setError('Examine Document', 'file_upload', err);
      });
    };
  }

  module.exports = LibraryUploadController;

})(global.angular);
