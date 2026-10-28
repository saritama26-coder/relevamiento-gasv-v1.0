import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudCheck,
  CloudUpload,
  CloudDownload,
  AlertCircle,
  RefreshCw,
  LogOut,
  FolderSync,
  History,
  CheckCircle2,
  X,
  ShieldCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  logoutGoogle,
  initAuth,
  getAccessToken,
} from '../services/googleAuth';
import {
  GoogleDriveService,
  DriveFileInfo,
  BackupPayload,
} from '../services/googleDriveService';
import { Ficha, ProjectData, CatalogosMap } from '../types';

interface GoogleDriveBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  fichas: Ficha[];
  projectData: ProjectData;
  catalogos: CatalogosMap;
  onRestoreBackup: (
    newFichas: Ficha[],
    newProjectData: ProjectData,
    newCatalogos: CatalogosMap
  ) => Promise<void>;
  lastAutoBackupTime: string | null;
  autoBackupStatus: 'idle' | 'syncing' | 'synced' | 'error';
  autoBackupError: string | null;
  onManualBackupTrigger: () => Promise<void>;
  onAutomaticBackupTrigger: () => Promise<void>;
}

export const GoogleDriveBackupModal: React.FC<GoogleDriveBackupModalProps> = ({
  isOpen,
  onClose,
  fichas,
  projectData,
  catalogos,
  onRestoreBackup,
  lastAutoBackupTime,
  autoBackupStatus,
  autoBackupError,
  onManualBackupTrigger,
  onAutomaticBackupTrigger,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupsList, setBackupsList] = useState<DriveFileInfo[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage
        ? localStorage.getItem('gdrive_auto_backup_enabled') !== 'false'
        : true;
    } catch {
      return true;
    }
  });

  // Reflect the lifetime of the in-memory OAuth token in the UI.
  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => setToken(null), 50 * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [token]);

  useEffect(() => {
    const unsubscribe = initAuth((currentUser, currentToken) => {
      setUser(currentUser);
      setToken(currentToken);
      if (currentToken) {
        loadBackups(currentToken);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleToggleAutoBackup = async (enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    try {
      localStorage.setItem('gdrive_auto_backup_enabled', enabled ? 'true' : 'false');
    } catch {
      // ignore in sandboxed environments
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!enabled) {
      setSuccessMessage('El respaldo automático quedó pausado. Tus fichas locales no se modificarán.');
      return;
    }
    const currentToken = await getAccessToken();
    if (!currentToken) {
      setSuccessMessage('Respaldo automático activado. Autoriza Google Drive para iniciar la primera copia.');
      return;
    }
    try {
      await onAutomaticBackupTrigger();
      await loadBackups(currentToken);
      setSuccessMessage('Respaldo automático activado y primera copia solicitada.');
    } catch (e: any) {
      setErrorMessage(e?.message || 'No se pudo iniciar el respaldo automático.');
    }
  };

  const loadBackups = async (accessToken: string) => {
    setIsLoadingBackups(true);
    try {
      const files = await GoogleDriveService.listBackups(accessToken);
      setBackupsList(files);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || 'No se pudo consultar la lista de respaldos en Google Drive.');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleLogin = async (backupCurrentState = true): Promise<string | null> => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setSuccessMessage('Sesión iniciada con éxito. Google Drive vinculado.');
        if (autoBackupEnabled && backupCurrentState) await onAutomaticBackupTrigger();
        await loadBackups(res.accessToken);
        return res.accessToken;
      }
      return null;
    } catch (e: any) {
      setErrorMessage(
        e.message || 'Error al iniciar sesión con Google. Intente nuevamente.'
      );
      return null;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      setToken(null);
      setBackupsList([]);
      setSuccessMessage('Sesión cerrada. Google Drive desvinculado.');
    } catch (e: any) {
      setErrorMessage(e.message || 'Error al desconectar');
    }
  };

  const handleCreateManualBackup = async () => {
    let currentToken = await getAccessToken();
    if (!currentToken) currentToken = await handleLogin(false);
    if (!currentToken) {
      setErrorMessage('Autoriza Google Drive para continuar con el respaldo.');
      return;
    }

    setIsBackingUp(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await onManualBackupTrigger();
      await loadBackups(currentToken);
      setSuccessMessage('¡Copia de seguridad guardada exitosamente en Google Drive!');
    } catch (e: any) {
      setErrorMessage(
        e.message || 'No se pudo subir la copia de seguridad a Google Drive.'
      );
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (file: DriveFileInfo) => {
    if (
      !window.confirm(
        `¿Desea restaurar el respaldo "${file.name}"?\nEsta acción reemplazará los datos actuales del proyecto por los del archivo guardado en Google Drive.`
      )
    ) {
      return;
    }

    let currentToken = await getAccessToken();
    if (!currentToken) currentToken = await handleLogin();
    if (!currentToken) {
      setErrorMessage('Autoriza Google Drive para descargar el respaldo.');
      return;
    }

    setRestoringId(file.id);
    setErrorMessage(null);
    try {
      const payload: BackupPayload = await GoogleDriveService.downloadBackup(
        currentToken,
        file.id
      );

      if (!payload || !Array.isArray(payload.fichas)) {
        throw new Error('El archivo de respaldo no tiene una lista válida de ambientes.');
      }

      await onRestoreBackup(
        payload.fichas || [],
        payload.projectData || {
          proyecto: '',
          ubicacion: '',
          bloque: '',
          profesional: 'Arq. Gabriel Saritama Veira',
          contacto: 'saritama26@gmail.com',
        },
        payload.catalogosPersonalizados || {}
      );

      setSuccessMessage(
        `Respaldo restaurado correctamente (${payload.fichas.length} ambientes recuperados).`
      );
      await loadBackups(currentToken);
    } catch (e: any) {
      setErrorMessage(e.message || 'Error al restaurar respaldo desde Drive.');
    } finally {
      setRestoringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#17365d] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/15 p-2 rounded-lg text-sky-200">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Respaldo Automático en Google Drive</h2>
              <p className="text-xs text-sky-200">
                Protección contra pérdida de datos por borrado de caché o cambio de dispositivo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-sm">
          {/* Messages */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center space-x-2 text-xs sm:text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center space-x-2 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Account status card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuario'}
                    className="w-10 h-10 rounded-full border border-slate-300 shadow-xs"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                    {user?.displayName ? user.displayName.charAt(0) : 'G'}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-slate-800">
                    {user ? user.displayName || user.email : 'Sin cuenta de Google vinculada'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {user
                      ? token
                        ? `Conectado como: ${user.email}`
                        : `Cuenta ${user.email} detectada; renueva el permiso de Drive para continuar.`
                      : 'Vincula tu cuenta para activar la copia automática en tu Google Drive'}
                  </div>
                </div>
              </div>

              <div>
                {user && token ? (
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Desconectar</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleLogin()}
                    disabled={isLoggingIn}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-medium shadow-xs transition-all text-xs disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                    <span>{isLoggingIn ? 'Conectando...' : user ? 'Renovar acceso a Drive' : 'Vincular Google Drive'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cloud Auto-Sync Status & Settings */}
          <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderSync className="w-5 h-5 text-sky-700" />
                <span className="font-semibold text-slate-800">
                  Respaldo Continuo Inteligente
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) => handleToggleAutoBackup(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            <p className="text-xs text-slate-600">
              Al guardar o editar fichas de relevamiento, el sistema sube automáticamente una copia en segundo plano a la carpeta <strong>Relevamiento_Arquitectonico_Backups</strong> de su Google Drive.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-sky-100 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Estado de sincronización</span>
                  <span className="font-medium text-slate-800">
                    {autoBackupStatus === 'syncing'
                      ? 'Sincronizando con Drive...'
                      : autoBackupStatus === 'synced'
                      ? 'Al día y protegido en Drive'
                      : autoBackupStatus === 'error'
                      ? 'Pendiente de conexión'
                      : 'Listo para respaldar'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-sky-100 flex items-center space-x-2">
                <CloudCheck className="w-4 h-4 text-sky-600 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Última copia automática</span>
                  <span className="font-medium text-slate-800">
                    {lastAutoBackupTime
                      ? new Date(lastAutoBackupTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : 'Aún no realizada'}
                  </span>
                </div>
              </div>
            </div>

            {autoBackupError && (
              <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-md border border-rose-100 flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{autoBackupError}</span>
              </div>
            )}
          </div>

          {/* Manual Backup Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="font-semibold text-slate-800">Crear Punto de Restauración</div>
              <div className="text-xs text-slate-500">
                Guarda una copia manual fechada con los {fichas.length} ambientes actuales
              </div>
            </div>
            <button
              onClick={handleCreateManualBackup}
              disabled={isBackingUp || !user}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#17365d] hover:bg-[#1f497d] text-white rounded-lg font-medium shadow-sm transition-colors text-xs disabled:opacity-50"
            >
              {isBackingUp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Subiendo a Drive...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>Crear Respaldo Ahora</span>
                </>
              )}
            </button>
          </div>

          {/* List of Backups stored in Google Drive */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-slate-800">
                  Respaldos Disponibles en su Google Drive
                </h3>
              </div>
              {user && (
                <button
                  onClick={() => token && loadBackups(token)}
                  disabled={isLoadingBackups}
                  className="text-xs text-sky-700 hover:text-sky-900 flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                  <span>Actualizar lista</span>
                </button>
              )}
            </div>

            {!user ? (
              <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                Inicia sesión con Google arriba para consultar y restaurar tus respaldos en la nube.
              </div>
            ) : isLoadingBackups ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl text-slate-500 text-xs flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                <span>Consultando archivos en Google Drive...</span>
              </div>
            ) : backupsList.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                Aún no hay copias de seguridad en Google Drive. Presiona "Crear Respaldo Ahora" o activa la copia continua.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                {backupsList.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800 truncate" title={file.name}>
                        {file.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleString()
                          : 'Fecha no disponible'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestore(file)}
                      disabled={restoringId === file.id}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg font-medium transition-colors shrink-0 disabled:opacity-50"
                    >
                      {restoringId === file.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Restaurando...</span>
                        </>
                      ) : (
                        <>
                          <CloudDownload className="w-3.5 h-3.5" />
                          <span>Restaurar</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
