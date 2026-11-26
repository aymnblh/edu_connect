const BIOMETRIC_LOCK_STORAGE_KEY = 'educonnect_biometric_lock';
const BIOMETRIC_PROMPT_DISMISSED_KEY = 'educonnect_biometric_prompt_dismissed';
export const BIOMETRIC_LOCK_EVENT = 'educonnect_biometric_lock_now';

export type BiometricLockConfig = {
  enabled: boolean;
  credentialId: string;
  userId: string;
};

let freshWebSignIn = false;

export function markFreshWebSignIn(): void {
  freshWebSignIn = true;
}

export function consumeFreshWebSignIn(): boolean {
  const wasFresh = freshWebSignIn;
  freshWebSignIn = false;
  return wasFresh;
}

export function requestWebAppLock(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BIOMETRIC_LOCK_EVENT));
  }
}

export function isBiometricPromptDismissed(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(BIOMETRIC_PROMPT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissBiometricPromptForSession(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(BIOMETRIC_PROMPT_DISMISSED_KEY, '1');
    }
  } catch {
    // Ignore storage quota / privacy mode errors.
  }
}

export function readBiometricLockConfig(): BiometricLockConfig | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(BIOMETRIC_LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BiometricLockConfig>;
    if (
      parsed &&
      parsed.enabled === true &&
      typeof parsed.credentialId === 'string' &&
      parsed.credentialId.length > 0 &&
      typeof parsed.userId === 'string' &&
      parsed.userId.length > 0
    ) {
      return {
        enabled: true,
        credentialId: parsed.credentialId,
        userId: parsed.userId,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function isBiometricLockEnabledForUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const config = readBiometricLockConfig();
  return Boolean(config && config.enabled && config.userId === userId);
}

export function disableBiometricLock(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(BIOMETRIC_LOCK_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors.
  }
}

export async function isPlatformBiometricSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.isSecureContext) {
    return false;
  }
  if (typeof PublicKeyCredential === 'undefined' || !navigator.credentials) {
    return false;
  }
  if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function randomChallenge(length = 32): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function enrollBiometricLock(user: {
  id: string;
  email?: string | null;
  fullName?: string | null;
}): Promise<BiometricLockConfig> {
  const supported = await isPlatformBiometricSupported();
  if (!supported) {
    throw new Error('Platform biometric authenticator unavailable.');
  }

  const encoder = new TextEncoder();
  const rpId = window.location.hostname;
  const userIdBytes = encoder.encode(user.id).slice(0, 64);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge() as BufferSource,
      rp: {
        name: 'WaselEdu',
        id: rpId,
      },
      user: {
        id: userIdBytes as BufferSource,
        name: user.email || user.id,
        displayName: user.fullName || user.email || 'WaselEdu User',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;

  if (!credential || !credential.rawId) {
    throw new Error('Biometric enrollment cancelled.');
  }

  const config: BiometricLockConfig = {
    enabled: true,
    credentialId: toBase64Url(credential.rawId),
    userId: user.id,
  };
  localStorage.setItem(BIOMETRIC_LOCK_STORAGE_KEY, JSON.stringify(config));
  return config;
}

export async function verifyBiometricLock(credentialId: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.credentials) {
    return false;
  }
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge() as BufferSource,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: 'public-key',
            id: fromBase64Url(credentialId) as BufferSource,
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}
