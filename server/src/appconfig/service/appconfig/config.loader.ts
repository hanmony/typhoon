import { readFileSync } from "fs";
import * as yaml from "js-yaml";
import { merge } from "lodash";

export const YAML_CONFIG_DIR = "./config/";
export const YAML_CONFIG_NAME = "config";

// export function ymlLoader() {
//     const txt = readFileSync(`${YAML_CONFIG_DIR}${YAML_CONFIG_NAME}.yml`, "utf8");
//     const common = yaml.load(txt) as Record<string, any>;
//     const env = process.env.NODE_ENV || common.env || "local";
//     const envtxt = readFileSync(`${YAML_CONFIG_DIR}${YAML_CONFIG_NAME}-${env}.yml`, "utf8");
//     const envConfig = yaml.load(envtxt) as Record<string, any>;
//     const ret = merge(common, envConfig);
//     return ret;
// }
