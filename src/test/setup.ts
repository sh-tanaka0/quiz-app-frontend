import "@testing-library/jest-dom";

// PointerEvent クラスが存在しない場合に基本的な定義を追加
if (typeof window !== "undefined" && !window.PointerEvent) {
  class PointerEvent extends MouseEvent {
    public pointerId?: number;
    public width?: number;
    public height?: number;
    public pressure?: number;
    public tangentialPressure?: number;
    public tiltX?: number;
    public tiltY?: number;
    public twist?: number;
    public pointerType?: string;
    public isPrimary?: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId;
      this.width = params.width;
      this.height = params.height;
      this.pressure = params.pressure;
      this.tangentialPressure = params.tangentialPressure;
      this.tiltX = params.tiltX;
      this.tiltY = params.tiltY;
      this.twist = params.twist;
      this.pointerType = params.pointerType;
      this.isPrimary = params.isPrimary;
    }
  }
  window.PointerEvent = PointerEvent as any;
}

// Element プロトタイプに必要なメソッドを追加 (存在しない場合)
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function (
      pointerId: number
    ): boolean {
      // console.log('Mock hasPointerCapture called', pointerId);
      // 実際のキャプチャ状態を管理するのは複雑なため、テストでは常に false を返すなど、
      // Radix UI がエラーを起こさない最低限の動作を模倣します。
      return false;
    };
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function (pointerId: number): void {
      // console.log('Mock setPointerCapture called', pointerId);
      // 特に処理は不要
    };
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function (
      pointerId: number
    ): void {
      // console.log('Mock releasePointerCapture called', pointerId);
      // 特に処理は不要
    };
  }
}
