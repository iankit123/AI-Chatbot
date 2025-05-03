// CommonJS format for compatibility
module.exports = {
  // The functions directory where netlify-lambda will output built functions
  publish: "netlify/functions-build",
  // Timeout for functions (optional)
  timeout: 10,
  // Other options
  config: {
    // Specify babelrc if needed
    babelrc: false
  }
}; 