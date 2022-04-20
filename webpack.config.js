const path = require("path");
const nodeExternals = require('webpack-node-externals');
const dts = require('dts-bundle');

const outDir = path.resolve(__dirname, 'build');


class DtsBundlePlugin {
    apply(compiler) {
        compiler.hooks.emit.tapAsync(
            'DtsBundlePlugin',
            (compl, callback) => {
                callback()

                dts.bundle({
                    name: 'tdsim',
                    main: outDir + '/types/**/*.d.ts',
                    out: outDir + '/tdsim.d.ts',
                    verbose: true
                });
            }
        )
    }
}


module.exports = {
    target: 'node',
    mode: "development",
    entry: {
        'tdsim': './src/entry.ts',
    },
    output: {
        path: outDir,
        filename: '[name].js',
        libraryTarget: "umd",
        library: 'tdsim',
        umdNamedDefine: true
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },
    externals: [nodeExternals()],
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [/node_modules/],
                use: 'ts-loader'
            }
        ],
    },
    plugins: [
        // new DtsBundlePlugin()
    ]
};
