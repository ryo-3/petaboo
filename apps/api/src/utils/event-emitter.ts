/**
 * シンプルなイベントエミッター
 * チーム申請のリアルタイム通知用
 */

type EventCallback = (data: any) => void;

interface Events {
  [key: string]: EventCallback[];
}

class EventEmitter {
  private events: Events = {};

  /**
   * イベントリスナーを登録
   */
  on(event: string, callback: EventCallback): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  /**
   * イベントリスナーを削除
   */
  off(event: string, callback: EventCallback): void {
    if (!this.events[event]) return;

    const index = this.events[event].indexOf(callback);
    if (index > -1) {
      this.events[event].splice(index, 1);
    }
  }

  /**
   * イベントを発火
   */
  emit(event: string, data: any): void {
    if (!this.events[event]) return;

    this.events[event].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Event callback error for ${event}:`, error);
      }
    });
  }

  /**
   * 指定イベントのリスナー数を取得
   */
  listenerCount(event: string): number {
    return this.events[event]?.length || 0;
  }

  /**
   * 全イベントのリスナーをクリア
   */
  removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

// グローバルなイベントエミッターインスタンス
export const teamEventEmitter = new EventEmitter();

// イベント名の定数
export const TEAM_EVENTS = {
  NEW_APPLICATION: "team:new-application",
  APPLICATION_APPROVED: "team:application-approved",
  APPLICATION_REJECTED: "team:application-rejected",
} as const;

export type TeamEventType = (typeof TEAM_EVENTS)[keyof typeof TEAM_EVENTS];

// チーム申請イベントのデータ型
export interface TeamApplicationEvent {
  teamCustomUrl: string;
  teamId: number;
  application: {
    id: number;
    userId: string;
    displayName: string | null;
    appliedAt: string;
  };
}
