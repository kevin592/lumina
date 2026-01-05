import { makeAutoObservable } from "mobx";
import { RootStore } from "../root";
import { BaseState, BooleanState, NumberState } from "./base";
import { ToastPlugin } from "../module/Toast/Toast";
import { eventBus } from "@/lib/event";
// 移除对 LuminaStore 的直接导入，避免循环依赖
// import { LuminaStore } from "../LuminaStore";
import i18n from "@/lib/i18n";
import { StorageState } from "./StorageState";
import { BaseStore } from "../baseStore";
import { getluminaEndpoint, isTauriAndEndpointUndefined } from "@/lib/luminaEndpoint";

export interface Events {
  data: (data: any) => void;
  error: (error: any) => void;
  select: (index: number) => void;
  update: () => void;
  finally: () => void;
  wait: () => void;
}

export const PromiseCall = async (f: Promise<any>, { autoAlert = true }: { autoAlert?: boolean, successMsg?: string } = {}) => {
  try {
    const r = await (new PromiseState({
      autoAlert,
      successMsg: i18n.t('operation-success'),
      function: async () => {
        return await f;
      }
    })).call()
    // 使用事件总线触发更新，避免循环依赖和模块重复
    eventBus.emit('store:update');
    return r
  } catch (error) {
    // 处理各种错误类型
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    } else {
      errorMessage = String(error);
    }
    RootStore.Get(ToastPlugin).error(errorMessage);
  }
}

export class PromiseState<T extends (...args: any[]) => Promise<any>, U = ReturnType<T>> {
  sid = "PromiseState";
  key?: string;
  loading = new BooleanState();
  value?: Awaited<U> | null;
  defaultValue: any = null;
  function!: T;
  autoAlert = true;
  autoUpdate = false;
  context: any = undefined;
  autoInit = false;
  autoClean = false;
  autoAuthRedirect = true;
  successMsg: string = "";
  errMsg: string = "";
  loadingLock = true;
  eventKey?: string;
  currentIndex = new NumberState({ value: 0 });

  get current(): Awaited<U> | undefined {
    if (Array.isArray(this.value) && this.value.length > 0 && this.currentIndex.value >= this.value.length) {
      this.currentIndex.setValue(0);
    }
    if (Array.isArray(this.value) && this.currentIndex.value < this.value.length) {
      return (this.value as unknown[])[this.currentIndex.value] as Awaited<U>;
    }
    return undefined;
  }

  async wait({ call = false } = {}): Promise<Awaited<U> | undefined> {
    return new Promise<Awaited<U>>((res) => {
      if (this.value !== undefined && this.value !== null) {
        if (Array.isArray(this.value)) {
          if (this.value.length > 0) {
            res(this.value as Awaited<U>);
          } else {
            // Empty array, resolve but don't return undefined
            res([] as unknown as Awaited<U>);
          }
        } else {
          res(this.value as Awaited<U>);
        }
      }

      if (call && !this.loading.value) {
        void this.call();
      }
    });
  }

  constructor(args: Partial<PromiseState<T, U>> = {}) {
    Object.assign(this, args);
    if (this.defaultValue) {
      this.value = this.defaultValue;
    }
    if (this.key) {
      RootStore.init().add(this, { sid: this.key });
    } else {
      makeAutoObservable(this);
    }
  }

  async setValue(val) {
    let _val = val;
    this.value = _val;
  }

  async getOrCall(...args: Parameters<T>): Promise<Awaited<U> | undefined> {
    if (this.value) {
      if (Array.isArray(this.value)) {
        if (this.value.length > 0) {
          return this.value;
        } else {
          return this.call(...args);
        }
      } else {
        return this.value;
      }
    } else {
      return this.call(...args);
    }
  }

  async call(...args: Parameters<T>): Promise<Awaited<U> | undefined> {
    const toast = RootStore.Get(ToastPlugin);
    const base = RootStore.Get(BaseStore);
    try {
      if (this.loadingLock && this.loading.value == true) return;
      this.loading.setValue(true);
      const res = await this.function.apply(this.context, args);
      this.setValue(res);
      if (this.autoAlert && this.successMsg && res) {
        toast.success(this.successMsg);
      }
      return res;
    } catch (error) {
      if (this.autoAlert && base.isOnline) {
        const message = error.message;
        if (message.includes("Unauthorized")) {
          toast.dismiss();
          if (this.autoAuthRedirect) {
            eventBus.emit('user:signout')
          }
        } else {
          this.errMsg = message;
          if (isTauriAndEndpointUndefined()) {
            return
          }
          toast.error(message);
        }
      } else {
        throw error;
      }
    } finally {
      this.loading.setValue(false);
      if (this.eventKey) {
        eventBus.emit(this.eventKey, this.value);
      }
    }
  }
}


export const PageSize = new StorageState<number>({ key: "pageSize", value: 30, default: 30 })
export class PromisePageState<T extends (...args: any) => Promise<any>, U = ReturnType<T>> {
  page: number = 1;
  size = PageSize
  sid = "PromisePageState";
  key?: string;
  loading = new BooleanState();
  isLoadAll: boolean = false;
  autoAuthRedirect: boolean = true;
  get isEmpty(): boolean {
    if (this.loading.value) return false
    if (this.value == null) return true
    if (Array.isArray(this.value)) {
      return this.value.length === 0;
    }
    return false;
  }
  get isLoading(): boolean {
    return this.loading.value
  }
  value?: Awaited<U> | null;
  defaultValue: any = [];
  function!: T;

  autoAlert = true;
  autoUpdate = false;
  autoInit = false;
  autoClean = false;
  context: any = undefined;

  successMsg: string = "";
  errMsg: string = "";

  loadingLock = true;

  toJSON() {
    return {
      value: this.value,
    };
  }

  constructor(args: Partial<PromisePageState<T, U>> = {}) {
    Object.assign(this, args);
    if (this.defaultValue) {
      this.value = this.defaultValue;
    }
    if (this.key) {
      RootStore.init().add(this, { sid: this.key });
    } else {
      makeAutoObservable(this);
    }
  }

  private async call(...args: Parameters<T>): Promise<Awaited<U> | undefined> {
    const toast = RootStore.Get(ToastPlugin);
    const base = RootStore.Get(BaseStore);

    try {
      if (this.loadingLock && this.loading.value == true) {
        console.warn('loadingLock', this.loading.value);
        return
      };
      if (this.isLoadAll) return this.value;
      this.loading.setValue(true);
      if (args?.[0]) {
        Object.assign(args?.[0], { page: this.page, size: Number(this.size.value) })
      } else {
        args[0] = { page: this.page, size: Number(this.size.value) }
      }
      const res = await this.function.apply(this.context, args);
      if (!Array.isArray(res)) throw new Error("PromisePageState function must return array")
      if (res.length == 0) {
        this.isLoadAll = true
        if (this.page == 1) {
          this.setValue(null);
        }
        return this.value
      }
      if (res.length == Number(this.size.value)) {
        if (this.page == 1) {
          this.setValue(res);
        } else {
          const currentValue = Array.isArray(this.value) ? this.value : [];
          this.setValue(currentValue.concat(res));
        }
      } else {
        if (this.page == 1) {
          this.setValue(res);
          this.isLoadAll = true
        } else {
          const currentValue = Array.isArray(this.value) ? this.value : [];
          this.setValue(currentValue.concat(res));
          this.isLoadAll = true
        }
      }

      if (this.autoAlert && this.successMsg && res) {
        toast.success(this.successMsg);
      }
      return this.value;
    } catch (error) {
      if (this.autoAlert && base.isOnline) {
        const message = error.message;
        if (message.includes("Unauthorized")) {
          toast.dismiss();
          if (this.autoAuthRedirect) {
            eventBus.emit('user:signout')
          }
        } else {
          this.errMsg = message;
          if (isTauriAndEndpointUndefined()) {
            return
          }
          toast.error(message);
        }
      } else {
        throw error;
      }
    } finally {
      this.loading.setValue(false);
    }
  }

  async setValue(val) {
    console.log(`[sid=${this.sid}] setValue called, val is ${Array.isArray(val) ? `array[${val.length}]` : typeof val}`);
    this.value = val;
  }

  async resetAndCall(...args: Parameters<T>): Promise<Awaited<U> | undefined> {
    this.isLoadAll = false
    this.page = 1
    return await this.call(...args)
  }
  async callNextPage(...args: Parameters<T>): Promise<Awaited<U> | undefined> {
    if (this.loading.value) return
    this.page++
    return await this.call(...args)
  }
}