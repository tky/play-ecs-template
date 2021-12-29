module.exports = {
  mode: "development",
  entry: {
    main: "./src/index.ts",
  },
  output: {
    path: `${__dirname}/../public/javascripts`,
    filename: "[name].js"
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader"
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"]
  }
};
