(function(PDFJS) {

  'use strict';

  var _getParameterByName = function(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
  };

  var viewport = document.getElementById('pageContainer');
  var PAGE_TO_VIEW = 1;
  var SCALE = 1.0;

  if (viewport) {

    viewport.innerHTML = '';

    var doc = {
      url: _getParameterByName('pdf')
    };

    PDFJS.getDocument(doc).then(function(pdfDocument) {
      // Document loaded, retrieving the page.
      return pdfDocument.getMetadata().then(function(metadata) {
        return pdfDocument.getOutline().then(function(outline) {
          return pdfDocument.getPage(PAGE_TO_VIEW).then(function(pdfPage) {
            // Creating the page view with default parameters.
            var pdfPageView = new PDFJS.PDFPageView({
              container: viewport,
              id: PAGE_TO_VIEW,
              scale: SCALE,
              defaultViewport: pdfPage.getViewport(SCALE)
            });
            // Associates the actual page with the view, and drawing it
            pdfPageView.setPdfPage(pdfPage);
            pdfPageView.draw().then(() => {

              var imgData = document.getElementById('page1').toDataURL('image/png');
              var today = new Date();
              var pdfMeta = metadata.info;
              var date = pdfMeta.CreationDate ? pdfMeta.CreationDate.substr(2, 14) : null;

              var result = {
                url: doc.url,
                noOfPages: pdfDocument.pdfInfo.numPages,
                publicationDate: date ? date.substr(0, 4) + '-' + date.substr(4, 2) + '-' + date.substr(6, 2) + 'T' + date.substr(8, 2) + ':' + date.substr(10, 2) + ':' + date.substr(12, 2) : null,
                author: pdfMeta.Author ? pdfMeta.Author.split(/\s*,\s*/) : '',
                title: pdfMeta.Title || '',
                description: pdfMeta.Subject || '',
                tags: pdfMeta.Keywords ? pdfMeta.Keywords.split(/\s*,\s*/) : [],
                outline: outline || [],
                createdAt: today.toISOString(),
                preview: imgData
              };

              var ipc = require('ipc');
              ipc.send('analyze-pdf-result', result);
            });
          });
        });
      });
    });
  }

})(global.PDFJS);
