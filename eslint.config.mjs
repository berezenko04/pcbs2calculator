import { createRequire } from "module";
const require = createRequire(import.meta.url);

const nextConfig = require("eslint-config-next");

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      "import/no-anonymous-default-export": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
