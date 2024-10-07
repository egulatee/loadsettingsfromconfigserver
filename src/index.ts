import * as core from "@actions/core";

const baseurl = core.getInput("cloud_config_server_base_url");
const path = core.getInput("path");
const property = core.getInput("propertytoretrieve");
const variabletoset = core.getInput("variabletoset");
//const environmentvariabletoset = core.getInput("environmentvariabletoset");
//const secretvariabletoset = core.getInput("secretvariabletoset");
const outputassecret = core.getInput("outputassecret");
const outputasenvvar = core.getInput("outputasenvvar");

const authtoken = core.getInput("authtoken");
const convertbase64 = core.getInput("convertbase64");

let url = baseurl + path;
console.log(`Connecting to ${url}`);

fetch(url, {
//  method: "POST",
  headers: {
    Authorization: "Bearer " + getAuthToken(),
  },
  cache: "no-store"
})
  .then((response) => {
    processResponse(response);
  })
  .catch((error: Error) => {
    core.error("Failed to connect to " + url);
    core.setFailed(`Failed to connect to ${url}`);
  });

async function processResponse(response: Response) {
  if (response.status === 200) {
    core.debug("Successfully fetched cloud config!");
    let json = await response.json();
    console.log("json=" + JSON.stringify(json));

    let propertySource = json["propertySources"];
    console.log("propertySource=" + JSON.stringify(propertySource));
    let source = propertySource[0]["source"];
    console.log("source=" + JSON.stringify(source));
    let value = source[property];
    console.log("value=" + value);

    if (value.startsWith("base64:")) {
      if (convertbase64 === "true") {
        let valuesub = value.substring(7);
        value = atob(valuesub)
        console.log("Decoded Value=" + value);
      }
    }

    if (outputasenvvar === "true") {
      console.log("outputasenvvar");
      console.log("setting[" + variabletoset + "] to value[" + value + "]");
      core.exportVariable(variabletoset, value);
      //        core.setOutput(environmentvariabletoset, value);
    }
    if (outputassecret === "true") {
      console.error("Not implemented");
      core.setFailed("Setting secret isn't implemented");
      // console.log("outputassecret")
      // console.log("setting[" + environmentvariabletoset +"] to value[" + value + "]");
      // core.setSecret(value);
      // core.exportVariable(environmentvariabletoset, value)
    }
  } else {
    core.error("Failed to fetch cloud config!");
    throw new Error("Failed to fetch cloud config!");
  }
}
function getAuthToken() {
  return authtoken;
}
