import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  ConfigSetting,
  retrievePropertyFromConfigServer,
  SinglePropertyRetrievalParams,
} from "./configservice/springconfig";
import { isUndefinedEmptyOrNull, stringToBoolean } from "./configservice/utils";
import {
  createOrUpdateSecretForRepo,
  createOrUpdateVarsForRepo,
} from "./github-api";

const config_server_oauth_token_endpoint = core.getInput(
  "config_server_oauth_token_endpoint"
);
if (isUndefinedEmptyOrNull(config_server_oauth_token_endpoint)) {
  throw new Error(`Config config_server_oauth_token_endpoint is not provided`);
}

const config_server_oauth_client_id = core.getInput(
  "config_server_oauth_client_id"
);
if (isUndefinedEmptyOrNull(config_server_oauth_client_id)) {
  throw new Error(`Config config_server_oauth_client_id is not provided`);
}
const config_server_oauth_client_secret = core.getInput(
  "config_server_oauth_client_secret"
);
if (isUndefinedEmptyOrNull(config_server_oauth_client_secret)) {
  throw new Error(`Config config_server_oauth_client_secret is not provided`);
}

const use_as_token_for_github_octokitstr = core.getInput(
  "use_as_token_for_github_octokit"
);
const use_as_token_for_github_octokit = stringToBoolean(
  use_as_token_for_github_octokitstr,
  false
);

const tokenforsecrets = core.getInput("token_for_github_octokit", {
  required: false,
});

const config_server_base_url = core.getInput("config_server_base_url", {
  required: true,
});
if (isUndefinedEmptyOrNull(config_server_base_url)) {
  throw new Error(`Config config_server_base_url is not provided`);
}
const path = core.getInput("path", { required: true });
if (isUndefinedEmptyOrNull(path)) {
  throw new Error(`Config path is not provided`);
}

const propertytoretrieve = core.getInput("propertytoretrieve", {
  required: true,
});
if (isUndefinedEmptyOrNull(propertytoretrieve)) {
  throw new Error(`Config propertytoretrieve is not provided`);
}
const variabletoset = core.getInput("variabletoset", { required: false });

const outputasenvvarstr = core.getInput("outputasenvvar", { required: false });
const outputasenvvar = stringToBoolean(outputasenvvarstr, false);

const outputassecretstr = core.getInput("outputassecret", { required: false });
const outputassecret = stringToBoolean(outputassecretstr, false);

const decodebase64str = core.getInput("decodebase64", { required: false });
const decodebase64 = stringToBoolean(decodebase64str, false);

main();

async function main() {
  let params: SinglePropertyRetrievalParams = {
    oauthtokendendpoint: config_server_oauth_token_endpoint,
    configserviceclientid: config_server_oauth_client_id,
    configserviceclientsecret: config_server_oauth_client_secret,
    configserviceurl: config_server_base_url,
    configservicepropertypath: path,
    propertytoretrieve: propertytoretrieve,
    decodebase64: decodebase64,
  };

  let setting = await retrievePropertyFromConfigServer(params);
  loadIntoGithubContext(setting);
}

async function loadIntoGithubContext(setting: ConfigSetting) {
  if (outputassecret) {
    console.log("Value is a secret");
    core.setSecret(setting.value);
  }

  let varname;
  if (isUndefinedEmptyOrNull(variabletoset)) {
    varname = propertytoretrieve;
  } else {
    varname = variabletoset;
  }

  console.log("VarName will be=" + varname);

  if (outputasenvvar) {
    console.log("Outputting as environment variable");
    if (use_as_token_for_github_octokit) {
      const octokit = github.getOctokit(setting.value);
      const { owner, repo } = github.context.repo;
      createOrUpdateVarsForRepo(octokit, owner, repo, varname, setting.value);
      core.setOutput(
        "result",
        "Environment Variable [" +
          varname +
          "] set to value[" +
          setting.value +
          "]"
      );
    } else {
      const octokit = github.getOctokit(tokenforsecrets);
      const { owner, repo } = github.context.repo;
      createOrUpdateVarsForRepo(octokit, owner, repo, varname, setting.value);
      console.log(
        "Environment Variable [" +
          varname +
          "] set to value[" +
          setting.value +
          "]"
      );
      core.setOutput(
        "result",
        "Environment Variable [" +
          varname +
          "] set to value[" +
          setting.value +
          "]"
      );
    }
  }

  if (outputassecret) {
    console.log("Outputting as Secret");
    if (use_as_token_for_github_octokit || !isUndefinedEmptyOrNull(tokenforsecrets)) {
      let octokit = undefined
      if (use_as_token_for_github_octokit) {
        console.log("Using the value as the Token to set Secrets");
        //Use the fetched value as the PAT token
        octokit = github.getOctokit(setting.value);
      }
      else if (!isUndefinedEmptyOrNull(tokenforsecrets)) {
        console.log("Setting secret [" + varname + "]");
        octokit = github.getOctokit(tokenforsecrets);
      }

      if (octokit == undefined) {
        throw new Error("Could not get Octokit");
      }
      const { owner, repo } = github.context.repo;
      try {
        await createOrUpdateSecretForRepo(
          octokit,
          owner,
          repo,
          varname,
          setting.value
        );
      } catch (error) {
        console.log("Error=" + error);
        await createOrUpdateSecretForRepo(
          octokit,
          owner,
          repo,
          varname,
          setting.value
        );
      }
      core.setOutput("result", "Secret [" + varname + "] set successfully");    
    }
  }
}
