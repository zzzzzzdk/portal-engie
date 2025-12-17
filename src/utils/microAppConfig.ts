import type { MicroAppMetadata, MicroAppSystem, MicroAppModule } from '@/types';
import { getMicroAppList } from '@/services/microApp';

export interface MicroAppConfigChangeDetail {
  systemId: string;
  moduleId: string;
  updates: Partial<MicroAppModule>;
  module: MicroAppModule;
}

export const MICRO_APP_CONFIG_CHANGED_EVENT = 'micro-app-config:changed';

/**
 * 微应用配置加载器
 * 负责从API接口加载微应用元数据
 */
class MicroAppConfigLoader {
  private metadata: MicroAppMetadata | null = null;
  private loading: boolean = false;

  /**
   * 加载微应用配置元数据
   */
  async loadMetadata(): Promise<MicroAppMetadata> {
    if (this.metadata) {
      return this.metadata;
    }

    if (this.loading) {
      // 等待加载完成
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.loadMetadata();
    }

    this.loading = true;
    try {
      const res = await getMicroAppList();
      if (res.code === 20000 && res.data) {
        this.metadata = res.data;
        return this.metadata;
      }
      throw new Error(res.message || 'Failed to load micro-app metadata');
    } catch (error) {
      console.error('Failed to load micro-app config:', error);
      // 返回空配置
      return { version: '1.0.0', apps: [] };
    } finally {
      this.loading = false;
    }
  }

  /**
   * 获取所有系统列表
   */
  async getAllSystems(): Promise<MicroAppSystem[]> {
    const metadata = await this.loadMetadata();
    return metadata.apps;
  }

  /**
   * 根据系统ID获取模块列表
   */
  async getModulesBySystemId(systemId: string): Promise<MicroAppModule[]> {
    const metadata = await this.loadMetadata();
    const system = metadata.apps.find(app => app.id === systemId);
    return system?.modules || [];
  }

  /**
   * 获取特定模块配置
   */
  async getModule(systemId: string, moduleId: string): Promise<MicroAppModule | null> {
    const modules = await this.getModulesBySystemId(systemId);
    return modules.find(m => m.id === moduleId) || null;
  }

  /**
   * 按分类分组系统
   */
  async getSystemsByCategory(): Promise<Record<string, MicroAppSystem[]>> {
    const systems = await this.getAllSystems();
    return systems.reduce((acc, system) => {
      const category = system.category || '其他';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(system);
      return acc;
    }, {} as Record<string, MicroAppSystem[]>);
  }

  /**
   * 重新加载配置(清除缓存)
   */
  reload(): void {
    this.metadata = null;
    this.loading = false;
  }

  /**
   * 更新指定模块的部分配置（例如图标）
   */
  async updateModuleConfig(
    systemId: string,
    moduleId: string,
    updates: Partial<MicroAppModule>
  ): Promise<MicroAppModule | null> {
    const metadata = await this.loadMetadata();
    const system = metadata.apps.find(app => app.id === systemId);
    if (!system) {
      console.warn('[microAppConfigLoader] System not found:', systemId);
      return null;
    }

    const module = system.modules.find(m => m.id === moduleId);
    if (!module) {
      console.warn('[microAppConfigLoader] Module not found:', moduleId);
      return null;
    }

    Object.assign(module, updates);
    this.emitModuleUpdate(systemId, moduleId, updates, module);
    return module;
  }

  /**
   * 将完整配置替换为指定数据
   * （供管理页面保存后刷新缓存）
   */
  setMetadata(metadata: MicroAppMetadata) {
    this.metadata = metadata;
  }

  private emitModuleUpdate(
    systemId: string,
    moduleId: string,
    updates: Partial<MicroAppModule>,
    module: MicroAppModule
  ) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
      return;
    }

    const detail: MicroAppConfigChangeDetail = {
      systemId,
      moduleId,
      updates: { ...updates },
      module: { ...module },
    };

    window.dispatchEvent(
      new CustomEvent<MicroAppConfigChangeDetail>(MICRO_APP_CONFIG_CHANGED_EVENT, {
        detail,
      })
    );
  }
}

// 导出单例实例
export const microAppConfigLoader = new MicroAppConfigLoader();
