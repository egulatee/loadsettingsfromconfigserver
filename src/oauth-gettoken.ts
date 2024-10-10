interface TokenResponse {
    access_token: string;
    expires_in: number;
    refresh_expires_in: number;
    token_type: string;
    'not-before-policy': number;
    scope: string;
  }
  
  export async function getToken(endpoint: string, clientid: string, clientsecret: string): Promise<string> {
    const tokenEndpoint = `${endpoint}`;
  
    console.log("Fetching token from " + endpoint);
    const data = {
      grant_type: 'client_credentials',
      client_id: clientid,
      client_secret: clientsecret,
    };
    console.log("Data=" + JSON.stringify(data));
  
    try {
      const response = await fetch(tokenEndpoint,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(data)
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
  