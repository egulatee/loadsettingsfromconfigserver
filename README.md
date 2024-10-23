# loadsettingsfromconfigserver

This allows one to set either environment variables and secrets in your repository from a configuration server.
Allows one to set 1 secret (config_server_oauth_client_secret) and populate the rest from a config server.

Currently using it with [Spring Cloud Config Server](https://cloud.spring.io/spring-cloud-config/).

## Example Usage

# Retrieving a PAT from config server
    - uses: egulatee/loadfromconfigserver@main
      with:
        config_server_base_url: "<configurationservice.url>" # the base url of your configuration server
        path: "/<dockerregistry>/<environment>"  # the path to the property in the configuration server
        propertytoretrieve: "<property>" #  the property to retrieve from the configuration server
        outputassecret: 'true' # set to true if you want the output as a secret in your repository
        use_as_token_for_github_octokit: 'true'  # set to true if you want to use this property as a token for the octokit api 
        config_server_oauth_token_endpoint: <https://<oauthserver>>/realms/<Realname>>/protocol/openid-connect/token>  # the oauth token endpoint for your configuration server
        config_server_oauth_client_id: githubaction # the oauth client id for your configuration server
        config_server_oauth_client_secret: ${{secrets.config_server_oauth_client_secret}}  # the oauth client secret for your configuration server  ## This is the only secret you need to keep in github

# Setting a secret in your github repo
    - uses: egulatee/loadfromconfigserver@main
      with:
        config_server_base_url: "configurationservice.url"
        path: "/<file>/dev"
        propertytoretrieve: "<property>"
        outputassecret: 'true'  # set to true if you want the output as a secret in your repository
        decodebase64: 'true' # set to true if you want the output decoded from base64
        config_server_oauth_token_endpoint: <https://<oauthserver>>/realms/<Realname>>/protocol/openid-connect/token>  # the oauth token endpoint for your configuration server
        config_server_oauth_client_id: githubaction # the oauth client id for your configuration server
        config_server_oauth_client_secret: ${{secrets.config_server_oauth_client_secret}}  # the oauth client secret for your configuration server  ## This is the only secret you need to keep in github
        token_for_github_octokit: ${{secrets.ACCESS_TOKEN}}  # This is the github token for the octokit api you retrieved in the previous step

# Setting an environment variable in your github repo
    - uses: egulatee/loadfromconfigserver@main
      with:
        config_server_base_url: "configurationservice.url"
        path: "/<file>/dev"
        propertytoretrieve: "<property>"
        outputasenvvar: 'true' # set to true if you want the output as an environment variable in your repository
        config_server_oauth_token_endpoint: <https://<oauthserver>>/realms/<Realname>>/protocol/openid-connect/token>  # the oauth token endpoint for your configuration server
        config_server_oauth_client_id: githubaction # the oauth client id for your configuration server
        config_server_oauth_client_secret: ${{secrets.config_server_oauth_client_secret}}  # the oauth client secret for your configuration server  ## This is the only secret you need to keep in github
        token_for_github_octokit: ${{secrets.ACCESS_TOKEN}}  # This is the github token for the octokit api you retrieved in the previous step