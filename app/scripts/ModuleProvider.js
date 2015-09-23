(function() {

  'use strict';

  function ModuleProvider() {

    var modules = [];
    var appcfg = require('../appcfg');

    var load = function() {

      for (var cfgName in appcfg.modules) {

        var cfg = appcfg.modules[cfgName];
        var module = `../${cfg.path}/${cfg.name}`;

        var Module = require(module);
        var instance = new Module;

        instance.initialize(cfg);

        modules.push({
          name: cfgName,
          instance: instance,
          info: cfg
        });
      }
    };

    load();

    return {
      $get: function() {
        return {
          config: appcfg,
          modules: modules
        };
      }
    };
  }

  module.exports = ModuleProvider;

})();
