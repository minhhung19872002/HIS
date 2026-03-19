export interface WebAuthnSupport {
  isSupported: boolean;
  isPlatformAuthenticatorAvailable: boolean;
}

export async function checkWebAuthnSupport(): Promise<WebAuthnSupport> {
  if (!window.PublicKeyCredential) {
    return { isSupported: false, isPlatformAuthenticatorAvailable: false };
  }
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return { isSupported: true, isPlatformAuthenticatorAvailable: available };
  } catch {
    return { isSupported: true, isPlatformAuthenticatorAvailable: false };
  }
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export interface RegisterOptions {
  challenge: string;
  rpId: string;
  rpName: string;
  userId: string;
  userName: string;
  userDisplayName: string;
  excludeCredentials?: string[];
}

export interface RegisterResult {
  credentialId: string;
  publicKey: string;
  attestationObject: string;
  clientDataJSON: string;
}

export async function registerCredential(options: RegisterOptions): Promise<RegisterResult> {
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: base64urlToBuffer(options.challenge),
    rp: { id: options.rpId, name: options.rpName },
    user: {
      id: base64urlToBuffer(options.userId),
      name: options.userName,
      displayName: options.userDisplayName,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256
      { alg: -257, type: 'public-key' },  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
    excludeCredentials: (options.excludeCredentials || []).map(id => ({
      id: base64urlToBuffer(id),
      type: 'public-key' as const,
    })),
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    credentialId: bufferToBase64url(credential.rawId),
    publicKey: bufferToBase64url(response.getPublicKey?.() || new ArrayBuffer(0)),
    attestationObject: bufferToBase64url(response.attestationObject),
    clientDataJSON: bufferToBase64url(response.clientDataJSON),
  };
}

export interface AuthOptions {
  challenge: string;
  rpId: string;
  allowCredentials: { id: string; type: string }[];
}

export interface AuthResult {
  credentialId: string;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
}

export async function authenticateCredential(options: AuthOptions): Promise<AuthResult> {
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: base64urlToBuffer(options.challenge),
    rpId: options.rpId,
    allowCredentials: options.allowCredentials.map(c => ({
      id: base64urlToBuffer(c.id),
      type: 'public-key' as const,
    })),
    userVerification: 'required',
    timeout: 60000,
  };

  const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    credentialId: bufferToBase64url(credential.rawId),
    authenticatorData: bufferToBase64url(response.authenticatorData),
    clientDataJSON: bufferToBase64url(response.clientDataJSON),
    signature: bufferToBase64url(response.signature),
  };
}
