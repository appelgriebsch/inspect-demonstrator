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

      var maxScrollPosition = -1 * (imgH * scaleX * this.scaleFactor) + (ch * this.scaleFactor);

      if (this.mousePos.deltaY > 0) {     // first go down (negative)
        this.mousePos.deltaY = 0;         // if scroll back up, just stop at origin
      } else if (Math.abs(this.mousePos.deltaY) > Math.abs(maxScrollPosition)) {
        this.mousePos.deltaY = maxScrollPosition;
      }

      ctx.clearRect(0, 0, cw, ch);

      ctx.save();
      ctx.translate(0, this.mousePos.deltaY);
      ctx.scale(scaleX * this.scaleFactor, scaleX * this.scaleFactor);

      ctx.drawImage(imageData, -0.5 * this.mousePos.x, -0.5 * this.mousePos.y);
      ctx.restore();
    };

    this.initialize = function() {

      document.body.onresize = render;
      document.getElementById('page').addEventListener('mousewheel', (evt) => {
        this.runAction(evt);
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

    this.activateScrolling = () => {
      angular.element(document.querySelector('#page')).addClass('scrolling-activated');
      document.getElementById('page').addEventListener('mousemove', this.runAction);
    };

    this.deactivateScrolling = () => {
      angular.element(document.querySelector('#page')).removeClass('scrolling-activated');
      document.getElementById('page').removeEventListener('mousemove', this.runAction);
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

      var canvas = document.getElementById('page');
      var rect = canvas.getBoundingClientRect();

      switch (this.action) {
      case 'zoom-in':
        angular.element(document.querySelector('#page')).removeClass('zoom-in-activated');
        this.mousePos.x = evt.clientX - rect.left;
        this.mousePos.y = evt.clientY - rect.top;
        this.scaleFactor += 0.25;
        break;

      case 'zoom-out':
        angular.element(document.querySelector('#page')).removeClass('zoom-out-activated');
        this.mousePos.x = evt.clientX - rect.left;
        this.mousePos.y = evt.clientY - rect.top;
        this.scaleFactor -= 0.25;
        break;

      case 'annotate':
        angular.element(document.querySelector('#page')).removeClass('annotate-activated');
        this.mousePos.x = evt.clientX - rect.left;
        this.mousePos.y = evt.clientY - rect.top;
        break;

      default:
        this.mousePos.deltaX += (evt.wheelDeltaX ? evt.wheelDeltaX : evt.movementX);
        this.mousePos.deltaY += (evt.wheelDeltaY ? evt.wheelDeltaY : evt.movementY);
        break;
      }

      render();
      this.action='';
    };

    $scope.$on('zoom-in', (event, args) => {
      angular.element(document.querySelector('#page')).addClass('zoom-in-activated');
      this.action = 'zoom-in';
    });

    $scope.$on('zoom-out', (event, args) => {
      angular.element(document.querySelector('#page')).addClass('zoom-out-activated');
      this.action = 'zoom-out';
    });

    $scope.$on('annotate', (event, args) => {
      angular.element(document.querySelector('#page')).addClass('annotate-activated');
      this.action = 'annotate';
    });

    $scope.$on('reset-page', (event, args) => {
      this.scaleFactor = 1.0;
      this.mousePos = { x: 0, y: 0, deltaX: 0, deltaY: 0};
      render();
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
