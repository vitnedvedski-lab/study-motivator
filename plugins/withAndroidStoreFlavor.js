const { withAppBuildGradle } = require('@expo/config-plugins');

const STRATEGY = "missingDimensionStrategy 'store', 'play'";

function withAndroidStoreFlavor(config) {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults;

    if (!buildGradle.contents.includes(STRATEGY)) {
      buildGradle.contents = buildGradle.contents.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {\n        ${STRATEGY}`
      );
    }

    return config;
  });
}

module.exports = withAndroidStoreFlavor;
