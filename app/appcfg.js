(function() {

  module.exports = {
    defaultModule: 'library',
    modules: {
      library: {
        path: 'modules/library',
        name: 'LibraryModule',
        url: '/app/library/view',
        state: 'app.library',
        tooltip: 'Access your library',
        icon: 'local_library'
      },
      incidents: {
        path: 'modules/incidents',
        name: 'IncidentModule',
        url: '/app/incidents/view',
        state: 'app.incidents',
        tooltip: 'Access your incidents',
        icon: 'content_copy'
      },
      activities: {
        path: 'modules/activities',
        name: 'ActivityModule',
        url: '/app/activities/view',
        state: 'app.activities',
        tooltip: 'Access your activities',
        icon: 'import_export'
      }
    }
  };

})();
