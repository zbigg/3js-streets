const webpack = require("webpack");
const HardSourceWebpackPlugin = require("hard-source-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require("path");

module.exports = {
    devtool: "source-map",
    entry: {
        app: "./app.ts"
    },
    output: {
        path: path.join(__dirname, "build"),
        filename: "[name].bundle.js"
    },

    resolve: {
        extensions: [".webpack.js", ".web.ts", ".ts", ".tsx", ".web.js", ".js"],
        modules: ["node_modules"],
    },
    externals: {
        three: "THREE",
    },
    module: {
        rules: [{
            test: /\.tsx?$/,
            loader: "ts-loader",
            exclude: /node_modules/,
            options: {
                onlyCompileBundledFiles: true,
                // use the main tsconfig.json for all compilation
                configFile: path.resolve(__dirname, "tsconfig.json")
            }
        }]
    },
    plugins: [
        new webpack.EnvironmentPlugin({
            // default NODE_ENV to development. Override by setting the environment variable NODE_ENV to 'production'
            NODE_ENV: process.env.NODE_ENV || "development"
        }),
        new HardSourceWebpackPlugin(),
        new CopyWebpackPlugin([
            require.resolve("three/build/three.min.js")
        ])
    ],
    devServer: {
        contentBase: __dirname,
        publicPath: "/build"
    },
    mode: process.env.NODE_ENV || "development"
};

