import { getAccessToken } from "./oauth-gettoken";
import { Logger, ILogObj } from "tslog";
const log: Logger<ILogObj> = new Logger({ minLevel: 3 });

export type ConfigSetting = {
  name: string;
  value: string;
  secret?: boolean;
  base64encoded?: boolean;
};

export type SinglePropertyRetrievalParams = {
  oauthtokendendpoint: string;
  configserviceclientid: string;
  configserviceclientsecret: string;
  configserviceurl: string;
  configservicepropertypath: string;
  propertytoretrieve: string;
  decodebase64?: boolean;
  accessToken?: string;
};

export type AllPropertyRetrievalParams = {
  oauthtokendendpoint: string;
  configserviceclientid: string;
  configserviceclientsecret: string;
  configserviceurl: string;
  configservicepropertypath: string;
  accessToken?: string;
};

export default async function retrievAllPropertiesFromConfigServer(
  params: AllPropertyRetrievalParams
)  : Promise<ConfigSetting[]> {
  log.debug("Params=" + JSON.stringify(params));

  if (params.oauthtokendendpoint == null) 
  {
    throw new Error("oauthtokendendpoint is null");
  } 
  if (params.configserviceclientid == null) 
  {
    throw new Error("configserviceclientid is null");
  } 
  if (params.configserviceclientsecret == null) 
  {
    throw new Error("configserviceclientsecret is null");
  } 
  
  const accessToken = await getAccessToken(
    params.oauthtokendendpoint,
    params.configserviceclientid,
    params.configserviceclientsecret
  );

  if (accessToken == undefined) {
    throw new Error("Undefined accessToken");
  }

  //  log.debug("Params=" + JSON.stringify(params));
  const result = await retrieveAllPropertyFromConfigServerUsingAccessToken({
    ...params,
    accessToken: accessToken,
  });
  log.debug("Result=" + JSON.stringify(result));
  return result
}

async function retrieveAllPropertyFromConfigServerUsingAccessToken(
  params: AllPropertyRetrievalParams
): Promise<ConfigSetting[]> {
  const url = params.configserviceurl + params.configservicepropertypath;
  log.trace(`Connecting to ${url}`);

  return fetch(url, {
    //  method: "POST",
    headers: {
      Authorization: "Bearer " + params.accessToken,
    },
    cache: "no-store",
  })
    .then(async (response) => {
      const result = await processAllResponse(response);
      log.trace("Result123=" + JSON.stringify(result));
      return result;
    })
    .catch((error: Error) => {
      //        core.error("Failed to connect to " + url);
      //        core.setFailed(`Failed to connect to ${url}`);
      log.warn(`Failed to connect to ${url}`);
      log.warn(error);
      throw error;
    });
    
}

async function processAllResponse(
  response: Response
): Promise<ConfigSetting[]> {
  if (response.status === 200) {
    const responsejson = await response.json();
    const propertySource = responsejson["propertySources"];
    log.trace("propertySource=" + JSON.stringify(propertySource));
    const source = propertySource[0]["source"];

    // let json  = JSON.parse(source);
    log.trace("Source=" + JSON.stringify(source));
    // log.info("Source properties=" + json.length);

    const result: ConfigSetting[] = [];

    for (const object in source) {
      log.trace("key=" + object);

      if (object.endsWith(".name")) {
        const keystring = removeLastOccurrence(object, ".name");

        const name = source[keystring + ".name"];
        const value = source[keystring + ".value"];
        const secret = source[keystring + ".secret"];
        const base64encoded = source[keystring + ".base64encoded"];

        result.push({
          name: name,
          value: value,
          secret: secret,
          base64encoded: base64encoded,
        });
      }
    }
    log.trace("Properties=" + JSON.stringify(result));
    return result;
  } else {
    throw Error(
      "Response status [" + response.status + "] text=[" + response.text + "]"
    );
  }
}

//
// Single property
//
export async function retrievePropertyFromConfigServer(
  params: SinglePropertyRetrievalParams
): Promise<ConfigSetting> {
  log.debug("Params=" + JSON.stringify(params));
  const accessToken = await getAccessToken(
    params.oauthtokendendpoint,
    params.configserviceclientid,
    params.configserviceclientsecret
  );

  if (accessToken == undefined) {
    throw new Error("Undefined accessToken");
  }

  //  log.debug("Params=" + JSON.stringify(params));
  const result = retrieveSinglePropertyFromConfigServerUsingAccessToken({
    ...params,
    accessToken: accessToken,
  });
  //  log.trace("REsult=" + JSON.stringify(result));
  return result;
}


async function retrieveSinglePropertyFromConfigServerUsingAccessToken(
  params: SinglePropertyRetrievalParams
): Promise<ConfigSetting> {
  const url = params.configserviceurl + params.configservicepropertypath;
  log.trace(`Connecting to ${url}`);

  return fetch(url, {
    //  method: "POST",
    headers: {
      Authorization: "Bearer " + params.accessToken,
    },
    cache: "no-store",
  })
    .then(async (response) => {
      const result = await processSingleResponse(response, params);
      log.trace("Result=" + JSON.stringify(result));
      return result;
    })
    .catch((error: Error) => {
      //        core.error("Failed to connect to " + url);
      //        core.setFailed(`Failed to connect to ${url}`);
      log.warn(`Failed to connect to ${url}`);
      log.warn(error);
      throw error;
    });
}

async function processSingleResponse(
  response: Response,
  params: SinglePropertyRetrievalParams
): Promise<ConfigSetting> {
  if (response.status === 200) {
    const json = await response.json();
    const propertySource = json["propertySources"];
    const source = propertySource[0]["source"];
    let value = source[params.propertytoretrieve];

    if (value != undefined && value != null && value.startsWith("base64:")) {
      if (params.decodebase64 === true) {
        const valuesub = value.substring(7);
        value = atob(valuesub);
        //        console.log("Decoded Value=" + value);
      } else {
        log.warn(
          "Value starts with a base64 prefix but decodebase64 has not been set"
        );
      }
    }

    // log.trace("propertytoretrieve=" + params.propertytoretrieve);
    // log.trace("Value=" + value);
    log.info(
      "Successfully fetched cloud config property [" +
        params.propertytoretrieve +
        "] from url=" +
        response.url
    );
    log.debug(
      "Successfully fetched cloud config property [" +
        params.propertytoretrieve +
        "] with value=[" +
        value +
        "] from url=" +
        response.url
    );
    return { name: params.propertytoretrieve, value: value };
  } else {
    log.error(
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

///

function removeLastOccurrence(source: string, target: string): string {
  const lastIndex = source.lastIndexOf(target);

  if (lastIndex === -1) {
    return source;
  }

  return source.slice(0, lastIndex) + source.slice(lastIndex + target.length);
}
