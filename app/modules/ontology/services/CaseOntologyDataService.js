(function () {
  'use strict';

  function CaseOntologyDataService (OntologyDataService, OntologyMetadataService) {
    const path = require('path');
    const app = require('electron').remote.app;
    const sysCfg = app.sysConfig();
    const Case = require(path.join(__dirname, '../models/Case'));
    const OwlIndividual = require(path.join(__dirname, '../models/OwlIndividual'));
    const OwlClass = require(path.join(__dirname, '../models/OwlClass'));

    let _caseClassIri = '';
    let _caseNamePropertyIri = '';
    let _caseEntityPropertyIri = '';
    let _caseEntityInversePropertyIri = '';
    let _initialized = false;

    let _objectProperties = [];
    let _datatypeProperties = [];
    let _classTree = [];
    let _classes = [];
    let _caseIris = [];

    const _filterClasses = (classes) => {
      const regexExcludedClasses = new RegExp(`_:[a-zA-Z0-9]+|${_caseClassIri}`, 'g');
      // filter out all classes we don't need
      return  classes.filter((c) => {
        return (c.iri.search(regexExcludedClasses) < 0);
      });
    };
    const sortByName = (item1, item2) => {
      return item1.name.localeCompare(item2.name);
    };

    const _buildTreeData = () => {
      const noCaseName = "[No case]";
      return new Promise((resolve, reject) => {
        OntologyDataService.fetchAllIndividualIris()
          .then(_loadEntities)
          .then((individuals) => {
          individuals = individuals.filter((i)=> {
            return i.classIris.indexOf(_caseClassIri) < 0;
          });
          const classIndividualsTree = _classes.map((c) => {
            const individuals_ = individuals.filter((item) => {
              return item.classIris.indexOf(c.iri) > -1;
            }).map((item) => {
              return {id: item.iri, name: item.label, cases: item.cases};
            }).sort(sortByName);
            return {id: c.iri, name: c.label, individuals: individuals_};
          }).reduce((accumulator, item) => {
            if (item.individuals.length > 0) {
              accumulator.push(item);
            }
            return accumulator;
          }, []).sort(sortByName);

            // filtering the individuals belonging to multiple cases
            const multipleCasesTree = individuals.filter((i) => {
              return i.cases.length > 1;
            }).map((i) => {
              const cases = i.cases.map((c) => {
                return { id: c, label: c};
              });
              return {id: i.iri, label: i.label, children: cases};
            });
            resolve({classIndividualsTree: classIndividualsTree, multipleCasesTree: multipleCasesTree});
        }).catch(reject);

      });
    };

    const _buildClassTree = (classes) => {
      console.log("classes", classes);
      // transform classes into nodes
      const nodes = classes.map((c) => {
        return { id: c.iri, title: c.label, children: [] };
      });
      // make a map for easy lookup
      const map = new Map(nodes.map((n) =>
        [n.id, n]
      ));
      const result = [];
      // populate the children array and add nodes without parents to the result
      classes.forEach((c) => {
        const node = map.get(c.iri);
        c.parentClassIris.forEach((iri) => {
          map.get(iri).children.push(node);
        });
        if (c.parentClassIris.length === 0) {
          result.push(node);
        }
      });
      console.log("classes tree", result);
      return result;
    };

    const _createCase = (identifier) => {
      return new Promise((resolve, reject) => {
        const c = new Case(identifier);
        c.name = identifier;
        c.description = [];
        c.metaData = OntologyMetadataService.newMetadata(identifier, sysCfg.user, new Date());
        OntologyDataService.insertIndividual(_convertToIndividual(c)).then(() => {
          return Promise.all([
            OntologyMetadataService.saveMetadata(c.metaData),
            OntologyDataService.fetchIndividualIrisForClass(_caseClassIri)
          ]);
        }).then((result) => {
          _caseIris = result[1].map((o) => {
            return o.iri;
          });
          resolve(c);
        }).catch(reject);
      });
    };

    const _convertToIndividual = (case_) => {
      const ontologyIri = OntologyDataService.ontologyIri();
      const caseIri = `${ontologyIri}${case_.identifier}`;
      const individual = OntologyDataService.createIndividual(ontologyIri, [_caseClassIri], caseIri);
      individual.datatypeProperties.push({iri: _caseNamePropertyIri, label: _caseNamePropertyIri.replace(ontologyIri , ''), target: case_.name});
      individual.objectProperties = case_.individualIris.map((iri) => {
        return { iri: _caseEntityPropertyIri, label: _caseEntityPropertyIri.replace(ontologyIri , ''), target: iri};
      });
      if (case_.description.length > 0) {
        individual.comments.push(case_.description);
      }
      return individual;
    };

    const _updateCaseMetadata = (caseIdentifier) => {
      return new Promise((resolve, reject) => {
        OntologyMetadataService.metadata(caseIdentifier).then((data) => {
          data.lastEditedBy = sysCfg.user;
          data.lastEditedOn = new Date();
          return OntologyMetadataService.saveMetadata(data);
        }).then(resolve)
          .catch(reject);
      });
    };

    const _saveAsIndividual = (object) => {
      if (!object) {
        return Promise.reject(new Error('Object must not be undefined'));
      }
      if (!object.label) {
        return Promise.reject(new Error('Object label must not be undefined'));
      }
      if (!object["class"]) {
        return Promise.reject(new Error('Object class must not be undefined'));
      }
      return new Promise((resolve, reject) => {
        const ontologyIri = OntologyDataService.ontologyIri();
        const iri = `${ontologyIri}${object.label}`;
        const oldIri = `${ontologyIri}${object.oldLabel}`;
        const individual = OntologyDataService.createIndividual(ontologyIri, [object["class"]], iri);
        const promises = [];
        if (object.comment) {
          individual.comments.push(object.comment);
        }
        if (object.cases && Array.isArray(object.cases)) {
          object.cases.forEach((c) => {
            individual.objectProperties.push({iri: _caseEntityInversePropertyIri, target: `${ontologyIri}${c}`});
            promises.push(_updateCaseMetadata(c));
          });
        }
        if (object.objectRelations && Array.isArray(object.objectRelations)) {
          object.objectRelations.forEach((prop) => {
            individual.objectProperties.push({iri: prop.relation, target: prop.target});
          });
        }
        if (object.reverseObjectRelations && Array.isArray(object.reverseObjectRelations)) {
          object.reverseObjectRelations.forEach((prop) => {
            individual.reverseObjectProperties.push({iri: prop.relation, target: prop.target});
          });
        }
        if (object.dataRelations && Array.isArray(object.dataRelations)) {
          object.dataRelations.forEach((prop) => {
            individual.datatypeProperties.push({iri: prop.relation, target: prop.target, type: prop.type});
          });
        }
        Promise.all([
          OntologyDataService.iriExists(iri),
          OntologyDataService.isIndividual(iri),
          OntologyDataService.iriExists(oldIri),
          OntologyDataService.isIndividual(oldIri)
        ]).then((result) => {
          // remove phase

          // if individual was renamed
          if (object.label !== object.oldLabel) {
            // if new iri already exists, throw error
            if (result[0] === true) {
              throw new Error(`Ontology already contains entity with iri ${iri}`);
            }
          } else {
            // if iri exists & entity is not an individual, throw error
            if ((result[0] === true) && (result[1] !== true )) {
              throw new Error('Entity with iri ${iri} is not an individual');
            }
          }

          // if iri exists & entity is an individual, remove entity
          if ((result[2] === true) && (result[3] === true )) {
            return OntologyDataService.removeIndividual(individual);
          }
          // else, nothing to do
          return true;
        }).then(() => {
          //insert individual & update case metadata
          promises.push(OntologyDataService.insertIndividual(individual));
          return Promise.all(promises);
        }).then(() => {
          resolve(individual);
        }).catch(reject);
      });
    };

    const _saveCase = (case_) => {
      if (!case_) {
        return Promise.reject(new Error('Case must not be null!'));
      }
      if (!(case_ instanceof Case)) {
        return Promise.reject(new Error('Case must be of type Case!'));
      }
      case_.metaData.lastEditedBy = sysCfg.user;
      case_.metaData.lastEditedOn = new Date();
      return new Promise((resolve, reject) => {
        const individual = _convertToIndividual(case_);
        OntologyDataService.removeIndividual(individual).then(() => {
          return OntologyDataService.insertIndividual(individual);
        }).then(() => {
          return OntologyMetadataService.saveMetadata(case_.metaData);
        }).then(resolve)
          .catch(reject);
      });
    };
    const _removeIndividual = (individualIri) => {
      if (!individualIri) {
        return Promise.reject(new Error('Individual iri must not be null!'));
      }
      // TODO: if individual is a member of several cases, it shouldn't be deleted completely
      return OntologyDataService.removeEntity(individualIri);
    };

    const _convertFromIndividual = (individual) => {
      const c = new Case(individual.label, individual.comments);
      let name = individual.datatypeProperties.find((prop) => {
        return prop.iri === _caseNamePropertyIri;
      });
      if (name === undefined) {
        c.name = individual.label;
      } else {
        c.name = name.target;
      }

      // add all individual iris that are connected to the case
      c.individualIris = individual.objectProperties
        .concat(individual.reverseObjectProperties)
        .filter((prop) => {
          return (prop.iri === _caseEntityPropertyIri || prop.iri === _caseEntityInversePropertyIri);
        })
        .map((prop) => {
          return prop.target;
        })
        .reduce((accumulator, iri) => {
          if (accumulator.indexOf(iri) < 0) {
            accumulator.push(iri);
          }
          return accumulator;
        }, []);
      return c;
    };

    const _loadEntitiesWithoutCase = () => {
      return new Promise((resolve, reject) => {
        OntologyDataService.fetchAllIndividualIris()
          .then(_loadEntities)
          .then((result) => {
          const individuals = result.filter((individual) => {
            return ((individual.cases.length === 0) && (individual.classIris.indexOf(_caseClassIri) < 0));
          });
          resolve(individuals);
        }).catch(reject);
      });
    };

    const _loadEntities = (iris) => {
      if (iris === undefined || !Array.isArray(iris)) {
        return Promise.reject('Iris be of type array!');
      }
      const promises = iris.map((iri) => {
        return _loadEntity(iri);
      });
      return new Promise((resolve, reject) => {
        Promise.all(promises).then((entities) => {
          entities = entities.filter((e) => {
            return e !== undefined;
          });
          resolve(entities);
        }).catch(reject);
      });

    };


    const _loadEntity = (iri) => {
      const ontologyIri = OntologyDataService.ontologyIri();
      return new Promise((resolve, reject) => {
        OntologyDataService.fetchEntity(iri).then((result) => {
          const entity = result;
          const cases = [];
          if (entity instanceof OwlIndividual) {
            entity.objectProperties = entity.objectProperties.filter((prop) => {
             if ((prop.iri === _caseEntityInversePropertyIri) && (_caseIris.indexOf(prop.target) > -1)) {
                if (cases.indexOf(prop.target) < 0) {
                  cases.push(prop.target);
                }
                return false;
              }
              return true;
            });
            entity.reverseObjectProperties = entity.reverseObjectProperties.filter((prop) => {
              if ((prop.iri === _caseEntityPropertyIri) && (_caseIris.indexOf(prop.target) > -1)) {
                if (cases.indexOf(prop.target) < 0) {
                  cases.push(prop.target);
                }
                return false;
              }
              return true;
            });
            entity.cases = cases.map((iri) => {
              return iri.replace(ontologyIri, '');
            });
          }
          if (entity instanceof OwlClass) {
            const props = _objectProperties.filter((prop) => {
              return entity.objectPropertyIris.indexOf(prop.iri) > -1;
            });
            entity.objectProperties = [];
            props.forEach((prop) => {
              prop.domainIris.forEach((source) => {
                prop.rangeIris.forEach((target) => {
                  if ((source === entity.iri) || (target === entity.iri)) {
                    entity.objectProperties.push({
                      source: source,
                      target: target,
                      iri: prop.iri,
                      label: prop.label
                    });
                  }
                });
              });
            });
          }
          if ((entity instanceof OwlClass) && (entity.iri === _caseClassIri)){
            resolve();
          } else {
            resolve(entity);
          }
        }).catch(reject);
      });
    };

    const _loadCaseList = () => {
      return new Promise((resolve, reject) => {
        OntologyDataService.fetchIndividualsForClass(_caseClassIri).then((individuals) => {
          const promises = individuals.map((individual) => {
            const c = _convertFromIndividual(individual);
            return Promise.all([
              Promise.resolve(c),
              OntologyMetadataService.metadata(c.identifier)
            ]);
          });
          return Promise.all(promises);
        }).then((result) => {
          const cases = result.map((r) => {
            r[0].metaData = r[1];
            return r[0];
          });
          resolve(cases);
        }).catch(reject);
      });
    };

    const _loadCase = (caseIdentifier, withIndividuals) => {
      if (!caseIdentifier) {
        return Promise.reject(Error("Case Identifier must not be undefined."));
      }
      return new Promise((resolve, reject) => {
        const caseIri = `${OntologyDataService.ontologyIri()}${caseIdentifier}`;
        let case_;
        OntologyDataService.fetchIndividual(caseIri).then((individual) => {
          case_ = _convertFromIndividual(individual);
          if (withIndividuals === true) {
            return _loadEntities(case_.individualIris);
          } else {
            return [];
          }

        }).then((individuals) => {
          case_.individuals = individuals;
          return  OntologyMetadataService.metadata(case_.identifier);
        }).then((metaData) => {
          case_.metaData = metaData;
          resolve(case_);
        }).catch(reject);
      });
    };

    const _createMetadataForCases = () => {

      const promises = [];
      return new Promise((resolve, reject) => {
        OntologyDataService.fetchIndividualsForClass(_caseClassIri).then((individuals) => {
          individuals.forEach((individual) => {
            OntologyMetadataService.metadata(individual.label)
              .then()
              .catch((err) => {
                if (err.status === 404) {
                  const metadata = OntologyMetadataService.newMetadata(individual.label, sysCfg.user, new Date());
                  promises.push(OntologyMetadataService.saveMetadata(metadata));
                } else {
                  throw err;
                }
              });
          });
          return Promise.all(promises);
        }).then(resolve)
          .catch(reject);
      });
    };

    const _searchTerms = () => {
      return new Promise((resolve, reject) => {
          OntologyDataService.fetchAllIndividualIris().then((result) => {
          let terms = result.map((iri) => {
            return {id: iri, label: iri.replace(OntologyDataService.ontologyIri(), '')};
          });
          terms = _classes.map((c) => {
            return { id: c.iri, label: c.label };
          }).concat(terms);

          resolve(terms);
        }).catch((err) => {
          reject(err);
        });
      });
    };


    const _initialize = () => {
      return new Promise((resolve, reject) => {
        OntologyMetadataService.initialize().then(() => {
          return OntologyMetadataService.profile("default");
        }).then((result) => {
          _caseClassIri = result.cases.caseClassIri;
          _caseNamePropertyIri = result.cases.caseNamePropertyIri;
          _caseEntityPropertyIri = result.cases.caseIndividualPropertyIri;
          _caseEntityInversePropertyIri = result.cases.individualCasePropertyIri;


          if (_initialized === true) {
            return Promise.resolve();
          } else {
            return Promise.resolve(
            OntologyDataService.initialize().then(() => {
              return Promise.all([
                OntologyDataService.fetchAllObjectProperties(),
                OntologyDataService.fetchAllDatatypeProperties(),
                OntologyDataService.fetchAllClassIris(),
                OntologyDataService.fetchIndividualIrisForClass(_caseClassIri),
              ]);
            }).then((result) => {
              _objectProperties = result[0];
              _datatypeProperties = result[1];
              _caseIris = result[3].map((o) => {
                return o.iri;
              });
              return _loadEntities(result[2]);
            }).then((result) => {
              _classes = _filterClasses(result);
              _classTree = _buildClassTree(_classes);
              _initialized = true;
            }));
          }
        }).then(resolve)
          .catch(reject);
      });
    };
    return {
      initialize: () => {
        return _initialize();
      },
      createCase: (identifier) => {
        return _createCase(identifier);
      },
      saveCase: (c) => {
        return _saveCase(c);
      },
      reset: () => {
        _initialized = false;
      },
      getClasses: () => {
        return _classes;
      },
      getObjectProperties: () => {
        return _objectProperties;
      },
      getDatatypeProperties: () => {
        return _datatypeProperties;
      },
      removeIndividual: (individualIri) => {
        return _removeIndividual(individualIri);
      },
      classTree: () => {
        return Promise.resolve(_classTree);
      },
      treeData: () => {
        return _buildTreeData();
      },
      saveAsIndividual: (object) => {
        return _saveAsIndividual(object);
      },
      loadCaseList: () => {
        return _loadCaseList();
      },
      loadCase: (identifier, withIndividuals) => {
        return _loadCase(identifier, withIndividuals);
      },
      loadIndividual: (iri) => {
        return _loadEntity(iri);
      },
      loadEntites: (iris) => {
        return _loadEntities(iris);
      },
      loadEntitesWithoutCase: () => {
        return _loadEntitiesWithoutCase();
      },
      createMetadataForCases: () => {
        return _createMetadataForCases();
      },
      searchTerms: () => {
        return _searchTerms();
      },
    };
  }
  module.exports = CaseOntologyDataService;
})();
