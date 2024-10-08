import * as core from "@actions/core";

const baseurl = core.getInput("cloud_config_server_base_url");
const path = core.getInput("path");
const property = core.getInput("propertytoretrieve");
const variabletoset = core.getInput("variabletoset");
const maskassecret = core.getInput("maskassecret");
const outputasenvvar = core.getInput("outputasenvvar");
const outputassecret = core.getInput("outputasecret");

const decodebase64 = core.getInput("decodebase64");

const AUTH_TOKEN_ENDPOINT = core.getInput("AUTH_TOKEN_ENDPOINT")
const CLIENT_ID = core.getInput("CLIENT_ID")
const CLIENT_SECRET = core.getInput("CLIENT_SECRET")

main()

async function main() {
  let accessToken = await getToken();
  console.log("Access Token=" + accessToken)
  connectToConfigServer(baseurl, path, accessToken);
}

async function connectToConfigServer(baseurl: string, path: string, accessToken: string) {
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
      if (decodebase64 === "true") {
        let valuesub = value.substring(7);
        value = atob(valuesub);
        console.log("Decoded Value=" + value);
      } else {
        console.warn(
          "Value starts with a base64 prefix but decodebase64 has not been set"
        );
      }
    }

    if (maskassecret === "true") {
      core.setSecret(value);
    }
    if (outputasenvvar === "true") {
      console.log("outputasenvvar");
      console.log("setting[" + variabletoset + "] to value[" + value + "]");
      core.exportVariable(variabletoset, value);
    }
    if (outputassecret === "true") {
      console.error("Not implemented");
      core.setFailed("Setting secret isn't implemented");
    }
  } else {
    core.error("Failed to fetch cloud config!");
    throw new Error("Failed to fetch cloud config!");
  }
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  'not-before-policy': number;
  scope: string;
}

async function getToken(): Promise<string> {
  const tokenEndpoint = `${AUTH_TOKEN_ENDPOINT}`;

  console.log("Fetching token from " + tokenEndpoint);
  const data = {
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  };
  console.log("Data=" + data);

  try {
    const response = await fetch(tokenEndpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: JSON.stringify(data)
      })
      let json = await response.json();
      console.log("Response=" + JSON.stringify(json));
      let tokenResponse = json as TokenResponse
      return tokenResponse.access_token;
  } catch (error) {
    console.error('Error getting token:', error);
    throw error;
  }
}
