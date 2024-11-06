import { Logger, ILogObj } from "tslog";
const log: Logger<ILogObj> = new Logger({minLevel: 2});

interface TokenResponse {
    access_token: string;
    expires_in: number;
    refresh_expires_in: number;
    token_type: string;
    'not-before-policy': number;
    scope: string;
  }
  
  export async function getAccessToken(endpoint: string, clientid: string, clientsecret: string): Promise<string> {
    const tokenEndpoint = `${endpoint}`;
  
    log.debug("Fetching access token from " + endpoint);
    const data = {
      grant_type: 'client_credentials',
      client_id: clientid,
      client_secret: clientsecret,
    };
//    console.log("Data=" + JSON.stringify(data));
  
    try {
      const response = await fetch(tokenEndpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(data)
        })
        
        if (response.status!== 200 ) {
          throw new Error("Failed to retrieve access token from " + endpoint + ". Status=" + response.status + ", text=" + await response.text())
        }

        const json = await response.json();
        log.trace("Response=" + JSON.stringify(json));
        const tokenResponse = json as TokenResponse
        return tokenResponse.access_token;
    } catch (error) {
      log.warn('Error getting token:', error);
      throw error;
    }
  }
  
