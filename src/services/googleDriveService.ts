import { Ficha, ProjectData, CatalogosMap } from '../types';

export interface BackupPayload {
  version: string;
  app: string;
  timestamp: string;
  projectData: ProjectData;
  catalogosPersonalizados: CatalogosMap;
  fichas: Ficha[];
}

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
}

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';
const BACKUP_FOLDER_NAME = 'Relevamiento_Arquitectonico_Backups';
const BACKUP_FILE_PREFIX = 'respaldo_relevamiento_';

export const GoogleDriveService = {
  /**
   * Find or create the application backup folder in Google Drive
   */
  async getOrCreateBackupFolder(accessToken: string): Promise<string> {
    const q = encodeURIComponent(
      `name = '${BACKUP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const searchRes = await fetch(`${DRIVE_API_URL}/files?q=${q}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchRes.ok) {
      const err = await searchRes.text();
      throw new Error(`Error al buscar carpeta en Drive: ${err}`);
    }

    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // Create folder
    const createRes = await fetch(`${DRIVE_API_URL}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: BACKUP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Error al crear carpeta en Drive: ${err}`);
    }

    const newFolder = await createRes.json();
    return newFolder.id;
  },

  /**
   * Uploads project backup to Google Drive using resumable upload.
   * Resumable uploads support large JSON files containing embedded photos.
   */
  async uploadBackup(
    accessToken: string,
    payload: BackupPayload,
    isManual = false
  ): Promise<DriveFileInfo> {
    const folderId = await this.getOrCreateBackupFolder(accessToken);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const projectName = payload.projectData.proyecto
      ? payload.projectData.proyecto.replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'sin_nombre';

    const fileName = isManual
      ? `${BACKUP_FILE_PREFIX}${projectName}_manual_${dateStr}.json`
      : `${BACKUP_FILE_PREFIX}${projectName}_autobackup.json`;

    let existingFileId: string | null = null;
    if (!isManual) {
      const q = encodeURIComponent(
        `name = '${fileName}' and '${folderId}' in parents and trashed = false`
      );
      const searchRes = await fetch(`${DRIVE_API_URL}/files?q=${q}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!searchRes.ok) {
        const err = await searchRes.text();
        throw new Error(`Error al buscar el respaldo automático en Drive: ${err}`);
      }
      const found = await searchRes.json();
      if (found.files?.length) existingFileId = found.files[0].id;
    }

    const fileContent = JSON.stringify(payload);
    const blob = new Blob([fileContent], { type: 'application/json' });
    const metadata: Record<string, unknown> = {
      name: fileName,
      mimeType: 'application/json',
    };
    if (!existingFileId) metadata.parents = [folderId];

    const target = existingFileId
      ? `${DRIVE_UPLOAD_URL}/files/${existingFileId}`
      : `${DRIVE_UPLOAD_URL}/files`;

    const initiateRes = await fetch(
      `${target}?uploadType=resumable&fields=id,name,modifiedTime,size`,
      {
        method: existingFileId ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'application/json',
          'X-Upload-Content-Length': String(blob.size),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initiateRes.ok) {
      const err = await initiateRes.text();
      throw new Error(`Error al preparar el respaldo en Drive: ${err}`);
    }

    const uploadUrl = initiateRes.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('Google Drive no devolvió la dirección para cargar el respaldo.');
    }

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: blob,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Error al subir el respaldo a Drive: ${err}`);
    }

    return await uploadRes.json();
  },

  /**
   * List available backups in Google Drive
   */
  async listBackups(accessToken: string): Promise<DriveFileInfo[]> {
    const folderId = await this.getOrCreateBackupFolder(accessToken);
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await fetch(
      `${DRIVE_API_URL}/files?q=${q}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime,size)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`No se pudo consultar los respaldos en Drive: ${err}`);
    }

    const data = await res.json();
    return data.files || [];
  },

  /**
   * Downloads and parses a backup from Google Drive
   */
  async downloadBackup(accessToken: string, fileId: string): Promise<BackupPayload> {
    const res = await fetch(`${DRIVE_API_URL}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error al descargar archivo de Drive: ${err}`);
    }

    return await res.json();
  },
};
