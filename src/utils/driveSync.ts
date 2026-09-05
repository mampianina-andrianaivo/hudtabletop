import { getAccessToken } from './googleAuth';
import { User } from 'firebase/auth';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';

const getFolderName = (user: User) => {
  const email = user.email || '';
  const nomgoogle = email.split('@')[0] || 'app';
  return `fcp_${nomgoogle}`;
};

async function findFolder(folderName: string, accessToken: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`${DRIVE_API_URL}?q=${query}&fields=files(id, name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

async function createFolder(folderName: string, accessToken: string): Promise<string> {
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  const res = await fetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });
  const data = await res.json();
  return data.id;
}

async function getOrCreateFolder(user: User, accessToken: string): Promise<string> {
  const folderName = getFolderName(user);
  const existingFolderId = await findFolder(folderName, accessToken);
  if (existingFolderId) {
    return existingFolderId;
  }
  return await createFolder(folderName, accessToken);
}

async function findDataFile(folderId: string, accessToken: string): Promise<string | null> {
  const query = encodeURIComponent(`name='data.json' and '${folderId}' in parents and trashed=false`);
  const res = await fetch(`${DRIVE_API_URL}?q=${query}&fields=files(id, name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

export async function loadDataFromDrive(user: User): Promise<any | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  const folderId = await getOrCreateFolder(user, accessToken);
  const fileId = await findDataFile(folderId, accessToken);
  if (!fileId) {
    // Immédiatement créer data.json initial dès la toute première connexion
    const initialPayload = {
      settings: null,
      produits: [],
      services: [],
      clients: [],
      ventes: []
    };
    await saveDataToDrive(user, initialPayload);
    return null; // Pas de données existantes à restaurer
  }

  const res = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error('Failed to download data.json');
  }
  const data = await res.json();
  return data;
}

export async function archiveDataFile(user: User): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  const folderId = await getOrCreateFolder(user, accessToken);
  const fileId = await findDataFile(folderId, accessToken);
  if (!fileId) return; // No file to archive

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const newName = `data_${yyyy}${mm}${dd}${hh}${min}${ss}${rand}.json`;

  const res = await fetch(`${DRIVE_API_URL}/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  });

  if (!res.ok) {
    throw new Error('Failed to archive data.json');
  }
}

export async function saveDataToDrive(user: User, payload: any): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  const folderId = await getOrCreateFolder(user, accessToken);
  const fileId = await findDataFile(folderId, accessToken);
  const fileContent = JSON.stringify(payload, null, 2);

  const metadata = {
    name: 'data.json',
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  let url = `${UPLOAD_API_URL}?uploadType=multipart`;
  let method = 'POST';

  if (fileId) {
    // Update existing
    url = `${UPLOAD_API_URL}/${fileId}?uploadType=multipart`;
    method = 'PATCH';
  } else {
    // Create new inside folder
    metadata['parents'] = [folderId];
    form.set('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error('Failed to save data.json to Drive');
  }
}
