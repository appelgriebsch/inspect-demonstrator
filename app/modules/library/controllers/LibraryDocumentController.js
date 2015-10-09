(function() {

  'use strict';

  function LibraryDocumentController($scope, $state, $stateParams, $q, $mdDialog, ActivityService, LibraryDataService) {

    var nativeImage = require('native-image');
    var docID = $stateParams.doc;
    var imageData;

    this.document;
    this.action;
    this.sidebarOpened = false;
    this.scaleFactor = 1.0;
    this.mousePos = {
      x: 0,
      y: 0,
      deltaX: 0,
      deltaY: 0
    };

    var render = () => {

      var canvas = document.getElementById('page');
      var ctx = canvas.getContext('2d');

      canvas.width = canvas.parentNode.clientWidth;
      canvas.height = canvas.parentNode.clientHeight;

      var cw = canvas.width;
      var imgW = imageData.width;
      var ch = canvas.height;
      var imgH = imageData.height;

      var scaleX = cw / imgW;
      var scaleY = ch / imgH;

      console.log(this.scaleFactor, this.mousePos);

      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      ctx.scale(scaleX * this.scaleFactor, scaleX * this.scaleFactor);
      ctx.translate(Math.min(this.mousePos.deltaX, cw), Math.min(this.mousePos.deltaY, ch));
      ctx.drawImage(imageData, -1 * this.mousePos.x, -1 * this.mousePos.y);
      ctx.restore();
    }

    this.initialize = function() {

      document.body.onresize = render;
      document.getElementById('page').addEventListener('mousewheel', (evt) => {
        this.mousePos.deltaX += evt.wheelDeltaX;
        this.mousePos.deltaY += evt.wheelDeltaY;
        render();
      });

      $q.when(LibraryDataService.initialize())
        .then(() => {
          $q.when(LibraryDataService.item(docID))
            .then((result) => {
              if (result._attachments) {
                imageData = new Image();
                imageData.onload = render;
                imageData.src = nativeImage.createFromBuffer(result._attachments[result.canonicalID].data).toDataUrl();
              }
              result.custom_tags = [];
              this.document = result;
            });
        });
    };

    this.openSidebar = function() {
      $q.when(true).then(() => {
        angular.element(document.querySelector('.sidebar')).addClass('sidebar-open');
        this.sidebarOpened = true;
      });
    };

    this.closeSidebar = function() {
      $q.when(true).then(() => {
        angular.element(document.querySelector('.sidebar')).removeClass('sidebar-open');
        this.sidebarOpened = false;
      });
    };

    this.runAction = (evt) => {

      evt.preventDefault();
      evt.stopPropagation();

      var rect = evt.target.getBoundingClientRect();

      this.mousePos.x = parseInt(evt.clientX - rect.left);
      this.mousePos.y = parseInt(evt.clientY - rect.top);

      switch (this.action) {
        case "zoom-in":
          angular.element(document.querySelector('#page')).removeClass('zoom-in-activated');
          this.scaleFactor += 0.1;
          render();
          break;

        case "zoom-out":
          angular.element(document.querySelector('#page')).removeClass('zoom-out-activated');
          this.scaleFactor -= 0.1;
          render();
          break;

        case "annotate":
          angular.element(document.querySelector('#page')).removeClass('annotate-activated');
          break;
      }
    };

    $scope.$on('zoom-in', (event, args) => {
      angular.element(document.querySelector('#page')).addClass('zoom-in-activated');
      this.action = "zoom-in";
    });

    $scope.$on('zoom-out', (event, args) => {
      angular.element(document.querySelector('#page')).addClass('zoom-out-activated');
      this.action = "zoom-out";
    });

    $scope.$on('annotate', (events, args) => {
      angular.element(document.querySelector('#page')).addClass('annotate-activated');
      this.action = "annotate";
    });

    $scope.$on('remove-document', (event, args) => {

      var confirm = $mdDialog.confirm()
        .title('Would you like to delete this document?')
        .content(this.document.title)
        .targetEvent(args)
        .ok('Yes, delete it')
        .cancel('No, please keep it');
      $mdDialog.show(confirm).then(() => {
        LibraryDataService.delete(this.document).then(() => {

          var details = angular.copy(this.document);
          details.status = 'deleted';
          delete details._attachments;
          delete details.preview;

          var info = {
            type: 'delete',
            id: details._id,
            details: details
          };
          ActivityService.addWarning(info).then(() => {
            $state.go('^.view');
          });
        });
      });
    });
  }

  module.exports = LibraryDocumentController;

})();
