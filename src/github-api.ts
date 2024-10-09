// In github-api.ts
import * as sodium from 'tweetsodium';
import * as github from '@actions/github';

export async function createOrUpdateSecretForRepo(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  secretName: string,
  secretValue: string
): Promise<void> {
  // Get the public key for the repo
  const { data: publicKey } = await octokit.rest.actions.getRepoPublicKey({
    owner,
    repo,
  });

  // Encrypt the secret
  const encryptedValue = encryptSecret(publicKey.key, secretValue);

  // Create or update the secret
  await octokit.rest.actions.createOrUpdateRepoSecret({
    owner,
    repo,
    secret_name: secretName,
    encrypted_value: encryptedValue,
    key_id: publicKey.key_id,
  });
}

function encryptSecret(publicKey: string, secretValue: string): string {
  const messageBytes = Buffer.from(secretValue);
  const keyBytes = Buffer.from(publicKey, 'base64');
  const encryptedBytes = sodium.seal(messageBytes, keyBytes);
  return Buffer.from(encryptedBytes).toString('base64');
}
