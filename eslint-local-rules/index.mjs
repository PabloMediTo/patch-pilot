import { repoJsRules } from "./repo-js-rules.mjs";

export const localRules = {
  ...repoJsRules,
};

export const localPlugin = {
  rules: localRules,
};
