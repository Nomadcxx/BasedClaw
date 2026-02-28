import { createWitDetectorHook } from './hooks/wit-detector';
import { createOcDelegateTool, PluginConfig } from './tools/oc-delegate';
import { PLUGIN_ID } from './constants';

let generationCounter = 0;

export interface OmocPluginApi {
  registerHook: (name: string, config: any) => void;
  registerTool: (name: string, config: any) => void;
  getConfig?: () => PluginConfig;
  [key: string]: any;
}

function makeGuardedApi(
  api: OmocPluginApi,
  gen: number,
  getLatestGen: () => number
): OmocPluginApi {
  return {
    ...api,
    registerHook: (name: string, config: any) => {
      const guardedHandler = (...args: any[]) => {
        if (gen !== getLatestGen()) {
          return null;
        }
        return config.handler(...args);
      };

      api.registerHook(name, {
        ...config,
        handler: guardedHandler,
      });
    },
    registerTool: (name: string, config: any) => {
      const guardedHandler = async (...args: any[]) => {
        if (gen !== getLatestGen()) {
          throw new Error(
            `Tool ${name} from generation ${gen} called but current generation is ${getLatestGen()}`
          );
        }
        return config.handler(...args);
      };

      api.registerTool(name, {
        ...config,
        handler: guardedHandler,
      });
    },
    getConfig: api.getConfig || (() => ({})),
  };
}

const plugin = {
  id: PLUGIN_ID,
  name: 'Basedclaw',
  description: '3-tier intelligence routing for openclaw (sub-wit/mid-wit/big-wit) - basedclaw fork',
  register(api: OmocPluginApi): void {
    const gen = ++generationCounter;
    const guardedApi = makeGuardedApi(api, gen, () => generationCounter);

    const getConfig = () => {
      if (typeof guardedApi.getConfig === 'function') {
        return guardedApi.getConfig() || {};
      }
      return {};
    };

    createWitDetectorHook(guardedApi);
    createOcDelegateTool(guardedApi, getConfig);
  },
};

export default plugin;
