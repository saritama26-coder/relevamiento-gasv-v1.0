import localforage from 'localforage';
import { Ficha, ProjectData, CatalogosMap } from '../types';
import { migrateLegacyObservations } from '../utils/helpers';

const store = localforage.createInstance({
  name: 'RelevamientoApp',
  storeName: 'fichas_v4',
});

export const StorageService = {
  async getFichas(): Promise<Ficha[]> {
    try {
      const storedFichas = (await store.getItem<Ficha[]>('fichas')) || [];
      const fichas = storedFichas.map((ficha) => migrateLegacyObservations(ficha));
      // Persist the one-time migration so reopening the app does not duplicate notes.
      if (fichas.some((ficha, index) => ficha !== storedFichas[index])) {
        try {
          await store.setItem('fichas', fichas);
        } catch (migrationError) {
          // Return the safely migrated view even if browser storage is temporarily read-only.
          console.warn('Could not persist observation migration yet:', migrationError);
        }
      }
      return fichas;
    } catch (e) {
      console.error('Error getting fichas from storage:', e);
      return [];
    }
  },

  async saveFicha(ficha: Ficha): Promise<void> {
    try {
      const fichas = await this.getFichas();
      const index = fichas.findIndex((f) => f.id === ficha.id);
      const updated: Ficha = migrateLegacyObservations({
        ...ficha,
        updatedAt: new Date().toISOString(),
      });
      if (index >= 0) {
        fichas[index] = updated;
      } else {
        fichas.push(updated);
      }
      await store.setItem('fichas', fichas);
    } catch (e) {
      console.error('Error saving ficha:', e);
      throw e;
    }
  },

  async deleteFicha(id: string): Promise<void> {
    try {
      const fichas = await this.getFichas();
      const filtered = fichas.filter((f) => f.id !== id);
      await store.setItem('fichas', filtered);
    } catch (e) {
      console.error('Error deleting ficha:', e);
      throw e;
    }
  },

  async getProjectData(): Promise<ProjectData> {
    try {
      const data = await store.getItem<ProjectData>('projectData');
      if (data) {
        if (!data.profesional || data.profesional === 'Arq. Gabriel Saritama V., Mgs' || data.profesional.includes('Saritama V.')) {
          data.profesional = 'Arq. Gabriel Saritama Veira';
        }
        return data;
      }
      return {
        proyecto: '',
        ubicacion: '',
        bloque: '',
        profesional: 'Arq. Gabriel Saritama Veira',
        contacto: 'saritama26@gmail.com',
      };
    } catch (e) {
      console.error('Error getting project data:', e);
      return {
        proyecto: '',
        ubicacion: '',
        bloque: '',
        profesional: 'Arq. Gabriel Saritama Veira',
        contacto: 'saritama26@gmail.com',
      };
    }
  },

  async saveProjectData(data: ProjectData): Promise<void> {
    try {
      await store.setItem('projectData', data);
    } catch (e) {
      console.error('Error saving project data:', e);
      throw e;
    }
  },

  async getCatalogos(): Promise<CatalogosMap> {
    try {
      const cats = await store.getItem<CatalogosMap>('catalogosPersonalizados');
      return cats || {};
    } catch (e) {
      console.error('Error getting catalogos:', e);
      return {};
    }
  },

  async saveCatalogos(catalogos: CatalogosMap): Promise<void> {
    try {
      await store.setItem('catalogosPersonalizados', catalogos);
    } catch (e) {
      console.error('Error saving catalogos:', e);
      throw e;
    }
  },

  async replaceFichas(fichas: Ficha[]): Promise<void> {
    try {
      await store.setItem('fichas', fichas.map(migrateLegacyObservations));
    } catch (e) {
      console.error('Error replacing fichas:', e);
      throw e;
    }
  },
};
