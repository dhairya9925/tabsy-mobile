type NetworkListener = (isOnline: boolean) => void;

let NetInfo: typeof import('@react-native-community/netinfo').default | null = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch {
  NetInfo = null;
}

let AppStateModule: any = null;
try {
  AppStateModule = require('react-native').AppState;
} catch {
  AppStateModule = null;
}

class NetworkService {
  private online: boolean = true;
  private listeners: Set<NetworkListener> = new Set();
  private unsubscribeNetInfo: (() => void) | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (NetInfo) {
      this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
        const isOnline = Boolean(
          state.isConnected && (state.isInternetReachable ?? true)
        );
        this.updateStatus(isOnline);
      });

      // Initial query
      NetInfo.fetch().then((state) => {
        const isOnline = Boolean(
          state.isConnected && (state.isInternetReachable ?? true)
        );
        this.updateStatus(isOnline);
      });
    }

    // Also re-check whenever the app returns from background to foreground
    if (AppStateModule) {
      AppStateModule.addEventListener('change', (status: string) => {
        if (status === 'active') {
          this.checkNow();
        }
      });
    }
  }

  private updateStatus(newStatus: boolean) {
    if (this.online !== newStatus) {
      this.online = newStatus;
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.online);
      } catch (err) {
        console.warn('[networkService] Listener error:', err);
      }
    });
  }

  public isOnline(): boolean {
    return this.online;
  }

  public async checkNow(): Promise<boolean> {
    if (NetInfo) {
      try {
        const state = await NetInfo.fetch();
        const isOnline = Boolean(
          state.isConnected && (state.isInternetReachable ?? true)
        );
        this.updateStatus(isOnline);
        return isOnline;
      } catch {
        return this.online;
      }
    }
    return this.online;
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state
    listener(this.online);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setSimulatedOnline(online: boolean) {
    this.updateStatus(online);
  }
}

export const networkService = new NetworkService();
