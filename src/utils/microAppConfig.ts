import type { MicroAppMetadata, MicroAppSystem, MicroAppModule } from '@/types';

/**
 * 微应用配置加载器
 * 负责从配置文件加载微应用元数据
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
      const response = await fetch('/config/micro-apps.json');
      if (!response.ok) {
        throw new Error('Failed to load micro-app metadata');
      }
      this.metadata = await response.json();
      return this.metadata!;
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
}

// 导出单例实例
export const microAppConfigLoader = new MicroAppConfigLoader();
