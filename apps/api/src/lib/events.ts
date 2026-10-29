import { EventEmitter } from "node:events"

class RealtimeEventBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(200) // Cho phép nhiều client SSE kết nối đồng thời
  }

  emitClassEvent(classId: string, event: { type: string; [key: string]: any }) {
    this.emit(`class:${classId}`, event)
  }

  onClassEvent(classId: string, listener: (event: any) => void) {
    this.on(`class:${classId}`, listener)
  }

  offClassEvent(classId: string, listener: (event: any) => void) {
    this.off(`class:${classId}`, listener)
  }
}

export const realtimeEventBus = new RealtimeEventBus()
