import {  makeObservable, observable } from "mobx";
import { type Store, type StoreClass } from "./standard/base";
import { useLocalObservable } from "mobx-react-lite";


export class RootStore {
  instanceMap = new Map<Function, Map<string, Store>>();
  instance: Record<string, Store> = {};
  providers: Store[] = observable.array([]);
  isInited = false;

  static init(args: Partial<RootStore> = {}): RootStore {
    if (!globalThis.store) {
      globalThis.store = new RootStore(args);
    }
    return globalThis.store;
  }

  add(store: Store, { sid }: { sid?: string } = {}) {
    if (store.disabled) {
      return;
    }

    const instanceMapId = sid ? sid : "singleton";
    const instanceId = sid ? sid : store.sid!;

    if (!this.has(store.constructor)) {
      this.instanceMap.set(store.constructor, new Map());
    }

    if (this.instanceMap.get(store.constructor)?.get(instanceMapId)) {
      return;
    }

    // 检查 providers 数组中是否已经存在相同 sid 的 store
    if (store.provider && this.providers.some(p => p.sid === store.sid)) {
      // 如果已存在，只更新 instanceMap，不添加到 providers
      this.instanceMap.get(store.constructor)?.set(instanceMapId, store);
      this.instance[instanceId] = store;
      if (store.init) {
        store.init();
      }
      return;
    }

    if (store.autoObservable) {
    }
    if (store.provider) {
      this.providers.push(store);
    }
    if (store.onAdded) {
      store.onAdded({ rootStore: this });
    }
    if (store.stores) {
      this.addStores(store.stores);
    }
    this.instanceMap.get(store.constructor)?.set(instanceMapId, store);
    this.instance[instanceId] = store;
    if (store.init) {
      store.init();
    }
  }

  addStores(store: Store[]) {
    store.forEach((i) => this.add(i));
    return this;
  }

  get<T extends Store>(store: StoreClass<T>, config: { sid?: string; args?: Partial<T> } = {}): T {
    const instanceMapId = config.sid ? config.sid : "singleton";
    const valid = this.instanceMap.has(store) && this.instanceMap.get(store)?.has(instanceMapId);
    if (!valid) {
      this.add(new store(config.args || {}), config);
    }
    return this.instanceMap.get(store)?.get(instanceMapId) as T;
  }

  public has(store: Function): boolean {
    return this.instanceMap.has(store);
  }

  constructor(args: Partial<RootStore> = {}) {
    Object.assign(this, args);
    makeObservable(this, {
      providers: true,
    });
    this.crawlStore(this);
  }

  crawlStore(obj: Object) {
    Object.values(obj).forEach((value) => {
      if (value?.sid) {
        this.add(value);
      }
    });
  }

  static Get<T extends Store>(store: StoreClass<T>, config: { sid?: string; args?: Partial<T> } = {}): T {
    return this.init().get(store, config);
  }

  static Local<T>(func: () => T, config: { sid?: string; args?: Partial<T> } = {}, ann?: any): T {
    const val = useLocalObservable(func, ann) as T;
    RootStore.init().instance["Local." + config.sid] = val;
    return val;
  }
}