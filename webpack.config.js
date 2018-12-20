// webpack v4
const path = require('path');

const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");

module.exports = {
    optimization: {
        splitChunks: {
            chunks: 'all',
        },
        minimizer: [
            new TerserPlugin(),
            new OptimizeCSSAssetsPlugin({})
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: "[name].css",
            chunkFilename: "[id].css"
        })
    ],
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader
                    },
                    "css-loader"
                ]
            },
            {
                test: /\.(webp|jpg|png|woff|woff2|eot|ttf|svg)$/,
                loader: 'url-loader?limit=100000'
            }
        ]
    },

    entry: {
        "main": ["./src/main.js", "./src/css/style.css", "./src/css/bootstrap-grid.css", "./src/css/owfont-regular.css"],
        "main-map": "./src/main-map.js",
        "main-weather": "./src/main-weather.js"
    },
    output: {
        path: path.join(__dirname, "website", 'dist'),
        filename: "[name].js"
    },
    devServer: {
        // Display only errors to reduce the amount of output.
        // stats: "errors-only",
        host: process.env.HOST,
        port: process.env.PORT,
        open: true, // Open the page in browser
        contentBase: path.join(__dirname, "website"),
        publicPath: path.join('/dist')
    }

};


