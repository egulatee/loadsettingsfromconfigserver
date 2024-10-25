import * as core from "@actions/core";
import * as github from "@actions/github";
import { getAccessToken as getAccessToken } from "./oauth-gettoken";
import { createOrUpdateSecretForRepo,createOrUpdateVarsForRepo } from "./github-api";

const config_server_oauth_token_endpoint = core.getInput("config_server_oauth_token_endpoint");
const config_server_oauth_client_id = core.getInput("config_server_oauth_client_id");
const config_server_oauth_client_secret = core.getInput("config_server_oauth_client_secret");
const use_as_token_for_github_octokit = stringToBoolean(
  core.getInput("use_as_token_for_github_octokit"),
  false
);

const tokenforsecrets = core.getInput("token_for_github_octokit", { required: false });

const config_server_base_url = core.getInput("config_server_base_url", {
  required: true,
});
const path = core.getInput("path", { required: true });

const property = core.getInput("propertytoretrieve", { required: true });
const variabletoset = core.getInput("variabletoset", { required: false });

const outputasenvvarstr = core.getInput("outputasenvvar", { required: false });
const outputasenvvar = stringToBoolean(outputasenvvarstr, false);

const outputassecretstr = core.getInput("outputassecret", { required: false });
const outputassecret = stringToBoolean(outputassecretstr, false);

const decodebase64str = core.getInput("decodebase64", { required: false });
const decodebase64 = stringToBoolean(decodebase64str, false);

main();

async function main() {

  getSettingUsingOAuth(config_server_oauth_token_endpoint, config_server_oauth_client_id, config_server_oauth_client_secret, config_server_base_url, path)
}

async function getSettingUsingOAuth(oauthtokendendpoint: string, clientid: string, clientsecret: string, configserverurl: string, configpropertypath: string) {
  let accessToken = await getAccessToken(
    oauthtokendendpoint,
    clientid,
    clientsecret
  );

  if (accessToken == undefined) {
    throw new Error("Undefined accessToken")
  }
  connectToConfigServer(configserverurl, path, accessToken);

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
      console.log("Value is a secret");
      core.setSecret(value);
    }

    let varname;
    if (isUndefinedEmptyOrNull(variabletoset)) {
      varname = property;
    } else {
      varname = variabletoset;
    }

    console.log("VarName will be=" + varname);

    if (outputasenvvar) {
      console.log("Outputting as environment variable");
      if (use_as_token_for_github_octokit) {
        const octokit = github.getOctokit(value);
        const { owner, repo } = github.context.repo;
        createOrUpdateVarsForRepo(octokit, owner, repo, varname, value);
        core.setOutput(
          "result",
          "Environment Variable [" + varname + "] set to value[" + value + "]"
        );
      } else {
        const octokit = github.getOctokit(tokenforsecrets);
        const { owner, repo } = github.context.repo;
        createOrUpdateVarsForRepo(octokit, owner, repo, varname, value);
        console.log("Environment Variable [" + varname + "] set to value[" + value + "]")
        core.setOutput(
          "result",
          "Environment Variable [" + varname + "] set to value[" + value + "]"
        );
      }
    }

    if (outputassecret) {
      console.log("Outputting as Secret");
      if (use_as_token_for_github_octokit) {
        console.log("Using the value as the Token to set Secrets");
        //Use the fetched value as the PAT token
        const octokit = github.getOctokit(value);
        const { owner, repo } = github.context.repo;
        await createOrUpdateSecretForRepo(octokit, owner, repo, varname, value);
        core.setOutput("result", "Secret [" + varname + "] set successfully");
      } else if (!isUndefinedEmptyOrNull(tokenforsecrets)) {
        console.log("Setting secret [" + varname + "]");
        const octokit = github.getOctokit(tokenforsecrets);
        const { owner, repo } = github.context.repo;

        await createOrUpdateSecretForRepo(octokit, owner, repo, varname, value);
        core.setOutput("result", "Secret [" + varname + "] set successfully");
      }
    }
  } else {
    core.error("Failed to fetch cloud config!" + response.status + "-" + response.statusText);
    throw new Error("Failed to fetch cloud config!" + response.status + "-" + response.statusText);
  }
}

function stringToBoolean(str: string, def: boolean): boolean {
  if (str === "") {
    return def;
  }
  //  console.log("String=" + str)
  if (str.toLowerCase() === "true") {
    //    console.log("Returning true")
    return true;
  }
  // console.log("Returning false")
  // console.log("String=" + str)
  return false;
}

function isUndefinedEmptyOrNull(str: string): boolean {
  if (str === undefined || str === null || str === "") {
    return true;
  }
  return false;
}
