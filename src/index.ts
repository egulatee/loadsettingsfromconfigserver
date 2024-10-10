import * as core from "@actions/core";
import * as github from "@actions/github";
import {getToken} from "./oauth-gettoken"
import { createOrUpdateSecretForRepo } from "./github-api";

const AUTH_TOKEN_ENDPOINT = core.getInput("AUTH_TOKEN_ENDPOINT");
const CLIENT_ID = core.getInput("CLIENT_ID");
const CLIENT_SECRET = core.getInput("CLIENT_SECRET");

const token = core.getInput("GITHUB_TOKEN", { required: true });

const baseurl = core.getInput("cloud_config_server_base_url", {
  required: true,
});
const path = core.getInput("path", { required: true });
const property = core.getInput("propertytoretrieve", { required: true });
const variabletoset = core.getInput("variabletoset", { required: false });

const outputasenvvar = stringToBoolean(
  core.getInput("outputasenvvar", { required: false })
);
const outputassecret = stringToBoolean(
  core.getInput("outputasecret", { required: false })
);
const decodebase64 = stringToBoolean(
  core.getInput("decodebase64", { required: false })
);

main();

async function main() {
  let accessToken = await getToken(
    AUTH_TOKEN_ENDPOINT,
    CLIENT_ID,
    CLIENT_SECRET
  );
  //  console.log("Access Token=" + accessToken)
  connectToConfigServer(baseurl, path, accessToken);
}

async function connectToConfigServer(
  baseurl: string,
  path: string,
  accessToken: string
) {
  let url = baseurl + path;
  console.log(`Connecting to ${url}`);
  fetch(url, {
    //  method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
    },
    cache: "no-store",
  })
    .then((response) => {
      processResponse(response);
    })
    .catch((error: Error) => {
      core.error("Failed to connect to " + url);
      core.setFailed(`Failed to connect to ${url}`);
    });
}

async function processResponse(response: Response) {
  if (response.status === 200) {
    core.debug("Successfully fetched cloud config!");
    let json = await response.json();
    let propertySource = json["propertySources"];
    let source = propertySource[0]["source"];
    let value = source[property];

    if (value.startsWith("base64:")) {
      if (decodebase64 === true) {
        let valuesub = value.substring(7);
        value = atob(valuesub);
//        console.log("Decoded Value=" + value);
      } else {
        console.warn(
          "Value starts with a base64 prefix but decodebase64 has not been set"
        );
      }
    }

    if (outputassecret) {
      console.log("Value is a secret")
      core.setSecret(value);
    }

    let varname;
    if (isUndefinedEmptyOrNull(variabletoset)) {
      varname = property;
    } else {
      varname = variabletoset;
    }

    console.log("VarName will be=" + varname)

    if (outputasenvvar) {
      console.log("Outputting as env var")

      core.exportVariable(varname, value);
      core.setOutput(
        "result",
        "Environment Variable [" + varname + "] set to value[" + value + "]"
      );
    }
    if (outputassecret) {
      console.log("Outputting as a secret")

      const octokit = github.getOctokit(token);
      const { owner, repo } = github.context.repo;

      await createOrUpdateSecretForRepo(octokit, owner, repo, varname, value);
      core.setOutput("result", "Secret [" + varname + "] set successfully");
    }
  } else {
    core.error("Failed to fetch cloud config!");
    throw new Error("Failed to fetch cloud config!");
  }
}

function stringToBoolean(str: string): boolean {
  console.log("String=" + str)
  if (str.toLowerCase() === "true") {
    console.log("Returning true")
    return true
  }
  console.log("Returning false")
  console.log("String=" + str)
  return false
}

function isUndefinedEmptyOrNull(str: string): boolean {
  if (str === undefined || str === null || str === "") {
    return true;
  }
  return false;
}
