(function(angular) {
  'use strict';

  function CaseOntologyDataService($log, $filter, OntologyDataService) {
    const app = require('electron').remote.app;
    const sysCfg = app.sysConfig();
    const Case = require('../models/Case');
    const OwlIndividual = require('../models/OwlIndividual');

    const caseClass = 'Fall';
    const caseNameProperty = 'Fallname';
    const caseEntityProperty = 'beinhaltet_Fallinformationen';
    const caseEntityInverseProperty = 'gehoert_zu_Fall';

    const regexExcludedClasses = new RegExp(`_:[a-zA-Z0-9]+|${caseClass}`, 'g');
    let isInitialized = false;

    const classes = {};
    let objectProperties = [];
    const classTree = [];

    const _createCase = (identifier) => {
      const c = new Case(identifier, sysCfg.user, new Date());
      return OntologyDataService.saveIndividual(_convertToIndividual(c));
    };

    const _convertToIndividual = (case_) => {
      const ontologyIri = OntologyDataService.ontologyIri();
      const individual = new OwlIndividual(ontologyIri, `${ontologyIri}${caseClass}`, `${ontologyIri}${case_.identifier}`);
      angular.forEach(case_.names, function(name) {
        individual.addDatatypeProperty(`${ontologyIri}${caseNameProperty}`, caseNameProperty, name);
      });
      angular.forEach(case_.individuals, function(ind) {
        individual.addObjectProperty(`${ontologyIri}${caseEntityProperty}`, caseEntityProperty, ind.iri);
      });

      if (case_.description.length > 0) {
        individual.addComment(case_.description);
      }
      return individual;
    };
    const _convertToCase = (individual) => {
      if (angular.isUndefined(individual)) {
        Promise.reject('Individual must not be null!');
      }
      if (!(individual instanceof OwlIndividual)) {
        Promise.reject('Individual of type OwlIndividual!');
      }
      return new Promise((resolve, reject) => {
        // TODO: as long as those values don't get saved
        const c = new Case(individual.label, sysCfg.user, new Date());
        c.status = 'open';

        const promises = [c];
        if (individual.comments.length > 0) {
          c.description = individual.comments[0];
        }
        const caseNamePropertyIri = `${individual.ontologyIri}${caseNameProperty}`;
        angular.forEach(individual.datatypeProperties, function(value, key) {
          if (key === caseNamePropertyIri) {
            c.names.push(value[0].target);
          }
        });
        const caseEntityPropertyIri = `${individual.ontologyIri}${caseEntityProperty}`;
        angular.forEach(individual.objectProperties, function(value, key) {
          if (key === caseEntityPropertyIri) {
            angular.forEach(value, function(prop) {
              promises.push(OntologyDataService.fetchIndividual(prop.target, true));
            });
          } else {
            // TODO: load other ObjectProperties of case?
          }
        });
        Promise.all(promises).then((result) => {
          resolve(result);
        });
      });
    };

    const _loadCase = (identifier, deep) => {
      if (angular.isUndefined(identifier)) {
        return Promise.reject('Identifier may not be null!');
      }
      return new Promise((resolve, reject) => {
        OntologyDataService.fetchIndividual(identifier, deep).then((individual) => {
          return _convertToCase(individual);
        }).then((result) =>  {
          const c = result[0];
          c.individuals = result.slice(1);
          resolve(c);
        }).catch((err) => {
          $log.error(err);
          reject('Could not load case with identifier: ' + identifier + '!');
        });
      });
    };
    const _buildClassesTree = (rootClassIris, maxLevel) => {
      classTree.length = 0;
      const convertClass = (clazz) => {
        return {iri: clazz.iri, name: clazz.name,  subClasses: []};
      };
      const build = (arr, parentIris, level, maxLevel) => {
        if (((maxLevel > -1) && (level > maxLevel)) || (parentIris.length === 0)) {
          return;
        }
        angular.forEach(parentIris, (iri) => {
          const clazz = classes[iri];
          if (clazz.name.search(regexExcludedClasses) < 0) {
            const convertedClass = convertClass(clazz);
            arr.push(convertedClass);
            build(convertedClass.subClasses, clazz.childClassIris, level + 1, maxLevel);
          }
        });
      };
      build(classTree, rootClassIris, 0, maxLevel);
    };
    const _loadCasesOverview = () => {
      const ontologyIri = OntologyDataService.ontologyIri();
      const caseClassIri = `${ontologyIri}${caseClass}`;
      return new Promise((resolve, reject) => {
        OntologyDataService.fetchIndividualsForClass(caseClassIri).then((iris) => {
          const promises = [];
          angular.forEach(iris, function(iri) {
            //promises.push(_loadCase(iri, false));
            promises.push(_loadCase(iri, true));
          });
          return Promise.all(promises);
        }).then((cases) => {
          resolve(cases);
        }).catch((err) => {
          $log.error(err);
          reject('Could not load cases overview!');
        });
      });
    };

    const _createAndAddIndividual = (classIri, instanceName, case_) => {
      if (!classIri) {
        Promise.reject('Class iri is undefined.');
      }
      if (!instanceName) {
        Promise.reject('Instance name is undefined.');
      }
      if (!case_) {
        Promise.reject('Case is undefined.');
      }
      return new Promise((resolve, reject) => {
        const ontologyIri = OntologyDataService.ontologyIri();
        const individual = new OwlIndividual(ontologyIri, classIri, `${ontologyIri}${instanceName}`);
        case_.individuals.push(individual);
        individual.addObjectProperty(`${ontologyIri}${caseEntityInverseProperty}`, caseEntityInverseProperty, `${ontologyIri}${case_.identifier}`);
        OntologyDataService.saveIndividual(individual).then(() => {
          return OntologyDataService.saveIndividual(_convertToIndividual(case_));
        }).then(()=> {
          resolve(individual);
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _removeIndividual = (individual, case_) => {
      if (!individual) {
        Promise.reject('Individual  is undefined.');
      }
      if (!case_) {
        Promise.reject('Case is undefined.');
      }
      return new Promise((resolve, reject) => {
        const ontologyIri = OntologyDataService.ontologyIri();

        //check whether this individual is only linked to this case
        const propIri = `${ontologyIri}${caseEntityInverseProperty}`;
        let justOneCase = true;
        angular.forEach(individual.objectProperties[propIri], (value) => {
          if (value.target !== `${ontologyIri}${case_.identifier}`) {
            justOneCase = false;
          }
        });

        //TODO: if individual is a member of several cases, it shouldn't be deleted completely

        OntologyDataService.removeIndividual(individual.iri).then(() => {
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };

    return {
      initialize: ()  => {
        if (isInitialized) {
          return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
          let promise;
          if (OntologyDataService.isInitialized()) {
            promise = Promise.resolve();
          } else {
            promise = OntologyDataService.initialize();
          }
          promise.then(() => {
            return Promise.all([
              OntologyDataService.fetchAllClasses(),
              OntologyDataService.fetchAllObjectProperties()
            ]);
          }).then((result) => {
            isInitialized = true;
            const rootClassIris = [];
            angular.forEach(result[0], (clazz) => {
              classes[clazz.iri] = clazz;
              if (angular.isUndefined(clazz.parentClassIri)) {
                rootClassIris.push(clazz.iri);
              }
            });
            objectProperties = result[1];
            _buildClassesTree(rootClassIris, -1);
            resolve();
          }).catch((err) => {
            reject(err);
          });
        });
      },
      createCase: (identifier) => {
        return _createCase(identifier);
      },
      saveNewCase: (c) => {
        if (angular.isUndefined(c)) {
          throw Error('Case must not be null!');
        }
        return OntologyDataService.saveIndividual(c.toIndividual(OntologyDataService.ontologyIri()));
      },

      getObjectProperties: () => {
        return angular.copy(objectProperties);
      },
      createAndAddIndividual: (classIri, instanceName, case_) => {
        return _createAndAddIndividual(classIri, instanceName, case_);
      },
      removeIndividual: (individual, case_) => {
        return _removeIndividual(individual, case_);
      },

      getClassTree: () => {
        return angular.copy(classTree);
      },

      loadCase: (identifier) => {
        return _loadCase(`${OntologyDataService.ontologyIri()}${identifier}`, true);
      },
      loadCasesOverview: () => {
        return _loadCasesOverview();
      },
    };
  }
  module.exports = CaseOntologyDataService;

})(global.angular);
