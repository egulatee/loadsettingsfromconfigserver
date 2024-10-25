import * as core from "@actions/core";
import * as github from "@actions/github";
import { ConfigSetting, getSettingUsingOAuth, SettingRetriavalParams } from "./springconfig";
import { isUndefinedEmptyOrNull, stringToBoolean } from "./utils";
import { createOrUpdateSecretForRepo, createOrUpdateVarsForRepo } from "./github-api";

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

const propertytoretrieve = core.getInput("propertytoretrieve", { required: true });
const variabletoset = core.getInput("variabletoset", { required: false });

const outputasenvvarstr = core.getInput("outputasenvvar", { required: false });
const outputasenvvar = stringToBoolean(outputasenvvarstr, false);

const outputassecretstr = core.getInput("outputassecret", { required: false });
const outputassecret = stringToBoolean(outputassecretstr, false);

const decodebase64str = core.getInput("decodebase64", { required: false });
const decodebase64 = stringToBoolean(decodebase64str, false);

main();

async function main() {

  let params : SettingRetriavalParams = {
    oauthtokendendpoint: config_server_oauth_token_endpoint,
    clientid: config_server_oauth_client_id,
    clientsecret: config_server_oauth_client_secret, 
    configserverurl: config_server_base_url,
    configpropertypath: path,
    propertytoretrieve: propertytoretrieve,
    decodebase64: decodebase64,
  }

  let setting = await getSettingUsingOAuth(params)
  loadIntoGithubContext(setting)
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
        "Environment Variable [" + varname + "] set to value[" + setting.value + "]"
      );
    } else {
      const octokit = github.getOctokit(tokenforsecrets);
      const { owner, repo } = github.context.repo;
      createOrUpdateVarsForRepo(octokit, owner, repo, varname, setting.value);
      console.log(
        "Environment Variable [" + varname + "] set to value[" + setting.value + "]"
      );
      core.setOutput(
        "result",
        "Environment Variable [" + varname + "] set to value[" + setting.value + "]"
      );
    }
  }
  
  if (outputassecret) {
    console.log("Outputting as Secret");
    if (use_as_token_for_github_octokit) {
      console.log("Using the value as the Token to set Secrets");
      //Use the fetched value as the PAT token
      const octokit = github.getOctokit(setting.value);
      const { owner, repo } = github.context.repo;
      await createOrUpdateSecretForRepo(octokit, owner, repo, varname, setting.value);
      core.setOutput("result", "Secret [" + varname + "] set successfully");
    } else if (!isUndefinedEmptyOrNull(tokenforsecrets)) {
      console.log("Setting secret [" + varname + "]");
      const octokit = github.getOctokit(tokenforsecrets);
      const { owner, repo } = github.context.repo;
  
      await createOrUpdateSecretForRepo(octokit, owner, repo, varname, setting.value);
      core.setOutput("result", "Secret [" + varname + "] set successfully");
    }
  }
}
