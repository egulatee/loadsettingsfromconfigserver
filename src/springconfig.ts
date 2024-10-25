import { getAccessToken } from "./oauth-gettoken";

export type ConfigSetting = {
  name: string;
  value: string;
};

export type SettingRetriavalParams = {
  oauthtokendendpoint: string;
  clientid: string;
  clientsecret: string;
  configserverurl: string;
  configpropertypath: string;
  propertytoretrieve: string;
  decodebase64?: boolean;
  accessToken?: string;
};

export async function getSettingUsingOAuth(params: SettingRetriavalParams) {
  let accessToken = await getAccessToken(
    params.oauthtokendendpoint,
    params.clientid,
    params.clientsecret
  );

  if (accessToken == undefined) {
    throw new Error("Undefined accessToken");
  }
  return connectToConfigServer({ ...params, accessToken: accessToken });
}

async function connectToConfigServer(
  params: SettingRetriavalParams
): Promise<ConfigSetting> {
  let url = params.configserverurl + params.configpropertypath;
  console.log(`Connecting to ${url}`);
  return fetch(url, {
     //  method: "POST",
    headers: {
      Authorization: "Bearer " + params.accessToken,
    },
    cache: "no-store",
  })
    .then((response) => {
      return processResponse(response, params);
    })
    .catch((error: Error) => {
      //        core.error("Failed to connect to " + url);
      //        core.setFailed(`Failed to connect to ${url}`);
      console.warn("Failed to connect to ${url}");
      console.warn(error);
      throw error;
    });
}

async function processResponse(
  response: Response,
  params: SettingRetriavalParams
): Promise<ConfigSetting> {
  if (response.status === 200) {
    console.debug("Successfully fetched cloud config!");
    let json = await response.json();
    let propertySource = json["propertySources"];
    let source = propertySource[0]["source"];
    let value = source[params.propertytoretrieve];

    if (value.startsWith("base64:")) {
      if (params.decodebase64 === true) {
        let valuesub = value.substring(7);
        value = atob(valuesub);
        //        console.log("Decoded Value=" + value);
      } else {
        console.warn(
          "Value starts with a base64 prefix but decodebase64 has not been set"
        );
      }
    }

    return {name: params.propertytoretrieve, value: value};

    
  } else {
    console.error(
      "Failed to fetch cloud config!" +
        response.status +
        "-" +
        response.statusText
    );
    throw new Error(
      "Failed to fetch cloud config!" +
        response.status +
        "-" +
        response.statusText
    );
  }
}
