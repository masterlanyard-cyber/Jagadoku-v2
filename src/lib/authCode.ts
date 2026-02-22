const codeStorageKey = (uid: string) => `jagadoku-auth-code-data-${uid}`;

const CODE_EXPIRY_MS = 10 * 60 * 1000;

type StoredCode = {
  code: string;
  expiresAt: number;
};

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendAuthCodeToEmail(email: string, uid: string) {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('Konfigurasi EmailJS belum lengkap. Isi NEXT_PUBLIC_EMAILJS_SERVICE_ID, NEXT_PUBLIC_EMAILJS_TEMPLATE_ID, dan NEXT_PUBLIC_EMAILJS_PUBLIC_KEY.');
  }

  const code = generateCode();
  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: email,
      otp_code: code,
      app_name: 'Jagadoku',
    },
  };

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Gagal mengirim kode ke Gmail. Periksa konfigurasi EmailJS.');
  }

  const stored: StoredCode = {
    code,
    expiresAt: Date.now() + CODE_EXPIRY_MS,
  };

  localStorage.setItem(codeStorageKey(uid), JSON.stringify(stored));
}

export function verifyAuthCode(uid: string, inputCode: string) {
  const raw = localStorage.getItem(codeStorageKey(uid));
  if (!raw) {
    return { valid: false, message: 'Kode belum dikirim. Klik "Kirim Kode" terlebih dahulu.' };
  }

  const stored = JSON.parse(raw) as StoredCode;

  if (Date.now() > stored.expiresAt) {
    localStorage.removeItem(codeStorageKey(uid));
    return { valid: false, message: 'Kode sudah kadaluarsa. Kirim ulang kode baru.' };
  }

  if (stored.code !== inputCode.trim()) {
    return { valid: false, message: 'Kode tidak cocok.' };
  }

  localStorage.removeItem(codeStorageKey(uid));
  return { valid: true, message: 'Kode valid.' };
}
