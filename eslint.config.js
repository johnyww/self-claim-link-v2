const path = require("node:path");
const js = require("@eslint/js");
const globals = require("globals");

// Import the plugins
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const jsxA11y = require("eslint-plugin-jsx-a11y");
const eslintPluginImport = require("eslint-plugin-import");
const nextPlugin = require("@next/eslint-plugin-next");
const typescriptEslintParser = require("@typescript-eslint/parser");
const typescriptEslintPlugin = require("@typescript-eslint/eslint-plugin");


module.exports = [
    // Global ignores
    {
        ignores: [
            "node_modules/",
            ".next/",
            "build/",
            "dist/",
            "coverage/",
            "logs/",
        ]
    },
    // Basic recommended JS rules
    js.configs.recommended,

    // React configurations
    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        plugins: {
            react,
            "react-hooks": reactHooks,
            "jsx-a11y": jsxA11y,
            import: eslintPluginImport,
            "@next/next": nextPlugin,
        },
        languageOptions: {
            ecmaVersion: 2020, // Adjust as needed
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
                project: ["./tsconfig.json"],
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        settings: {
            react: {
                version: "detect", // Automatically detect the React version
            },
            "import/resolver": {
                typescript: true,
                node: true,
            },
        },
        rules: {
            // General ESLint rules
            "no-unused-vars": "off", // Handled by TypeScript
            "no-undef": "off", // Handled by globals
            "react/react-in-jsx-scope": "off", // Not needed with new React JSX transform
            "react/prop-types": "off", // Not needed with TypeScript
            
            // React plugin rules
            ...react.configs.recommended.rules,
            ...react.configs["jsx-runtime"].rules, // For new JSX transform
            
            // React Hooks plugin rules
            ...reactHooks.configs.recommended.rules,
            
            // a11y plugin rules
            ...jsxA11y.configs.recommended.rules,
            "jsx-a11y/label-has-associated-control": "off", // Temporarily disable due to false positive bug

            // Next.js plugin rules
            ...nextPlugin.configs.recommended.rules,
            ...nextPlugin.configs["core-web-vitals"].rules, // Add core-web-vitals rules
        },
    },

    // CommonJS config files
    {
        files: [
            "jest.config.js",
            "next.config.js",
            "postcss.config.js",
            "tailwind.config.js",
        ],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "commonjs",
            globals: {
                ...globals.node,
                ...globals.jest, // Jest globals are needed for jest.config.js
            }
        },
        rules: {
            "no-undef": "off", // Globals handled by globals.node/jest
            "@typescript-eslint/no-var-requires": "off", // Allow require
        }
    },
    // ES Module config files (eslint.config.js, jest.setup.js)
    {
        files: [
            "eslint.config.js",
            "jest.setup.js",
        ],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.browser, // For global and fetch polyfills in jest.setup.js
                ...globals.jest, // For jest.mock, beforeEach, etc.
            }
        },
        rules: {
            "no-undef": "off", // Globals handled by globals.node/browser/jest
            "import/no-commonjs": "off", // Allow require in jest.setup.js (for util)
        }
    },
    // Apply Jest environment to test files
    {
        files: ["**/*.test.ts", "**/*.spec.ts"],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "module", // Tests are likely ESM
            globals: {
                ...globals.jest,
                // Add any other specific test globals
            }
        },
        rules: {
            "no-undef": "off", // Jest globals are handled by globals.jest
        }
    },
    // Type-specific rules for TypeScript files
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: typescriptEslintParser, // Use the TypeScript parser
            parserOptions: {
                project: ["./tsconfig.json"],
            },
        },
        plugins: {
            "@typescript-eslint": typescriptEslintPlugin,
        },
        rules: {
            ...typescriptEslintPlugin.configs.recommended.rules,
            "@typescript-eslint/no-unused-vars": "off", // Temporarily disable due to persistent false positives
            "@typescript-eslint/no-explicit-any": "off", // Temporarily disable due to deep configuration issue
        }
    }
];