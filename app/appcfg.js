(function() {

  module.exports = {
    defaultModule: 'library',
    modules: {
      library: {
        path: 'modules/library',
        name: 'LibraryModule',
        url: '/app/library/view',
        state: 'app.library',
        label: 'Library',
        tooltip: 'Access your library',
        icon: 'local_library'
      },
      /*incidents: {
       path: 'modules/incidents',
       name: 'IncidentModule',
       url: '/app/incidents/view',
       state: 'app.incidents',
       label: 'Incidents',
       tooltip: 'Access your incidents',
       icon: 'content_copy'
       },*/
      ontology: {
        path: 'modules/ontology',
        name: 'OntologyModule',
        url: '/app/ontology/view',
        state: 'app.ontology',
        label: 'Ontology',
        tooltip: 'Browse the Ontology',
        icon: 'blur_on'
      },
       /*cases: {
       path: 'modules/cases',
       name: 'CasesModule',
       url: '/app/cases/view',
       state: 'app.cases',
       label: 'Cases',
       tooltip: 'Working with Cases',
       icon: 'fingerprint'
       },*/
      activities: {
        path: 'modules/activities',
        name: 'ActivityModule',
        url: '/app/activities/view',
        state: 'app.activities',
        label: 'Activities',
        tooltip: 'Access your activities',
        icon: 'import_export'
      },
      emv: {
        path: 'modules/emv',
        name: 'EmvModule',
        url: '/app/emv/view',
        state: 'app.emv',
        label: 'EMV',
        tooltip: 'EMV Import',
        icon: 'nfc'
      }
    }
  };


})();
