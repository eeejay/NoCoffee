module.exports = {
  env: {
      browser: true,
      es6: true,
      webextensions: true
  },
  extends: [
      "eslint:recommended"
  ],
  rules: {
      "semi": ["error", "always"],
      "space-before-function-paren": ["error", "never"],
      "no-constant-condition": "off",
      "no-fallthrough": "off",
      "no-console": ["error", { "allow": ["warn"] }]
  }
};
