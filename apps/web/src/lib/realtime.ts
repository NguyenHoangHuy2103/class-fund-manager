import { useEffect, useRef } from "react"
import { API_BASE } from "./api"
import { useStore } from "./store"

type RealtimeCallback = (event: { type: string; [key: string]: any }) => void

class RealtimeClient {
  private eventSource: EventSource | null = null
  private listeners: Set<RealtimeCallback> = new Set()
  private reconnectTimer: any = null
  private backoffMs = 1000
  private currentClassId: string | null = null
  private isDocumentFocused = true

  constructor() {
    if (typeof window !== "undefined") {
      // Tự động kích hoạt làm mới khi người dùng chuyển tab quay lại (Window Focus / Visibility Change)
      window.addEventListener("focus", () => this.handleFocusChange(true))
      document.addEventListener("visibilitychange", () => {
        this.handleFocusChange(document.visibilityState === "visible")
      })
    }
  }

  private handleFocusChange(focused: boolean) {
    if (focused && !this.isDocumentFocused) {
      this.isDocumentFocused = true
      // Gửi sự kiện REFRESH để các trang tự động đồng bộ lại ngay khi người dùng chuyển sang tab này
      this.notify({ type: "WINDOW_FOCUS_REFRESH" })
    } else if (!focused) {
      this.isDocumentFocused = false
    }
  }

  public connect(classId: string | null | undefined) {
    if (!classId) {
      this.disconnect()
      return
    }

    if (this.eventSource && this.currentClassId === classId) {
      return // Đã kết nối với cùng lớp
    }

    this.disconnect()
    this.currentClassId = classId

    try {
      const url = `${API_BASE}/events/stream`
      const es = new EventSource(url, { withCredentials: true })

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          this.notify(data)
          this.backoffMs = 1000 // Reset backoff khi nhận dữ liệu
        } catch {
          // Bỏ qua heartbeat hoặc chuỗi không phải JSON
        }
      }

      es.onerror = () => {
        // SSE tự động retry, nhưng nếu lỗi ngắt kết nối thì thiết lập reconnect
        if (es.readyState === EventSource.CLOSED) {
          this.disconnect()
          this.scheduleReconnect()
        }
      }

      this.eventSource = es
    } catch {
      this.scheduleReconnect()
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.currentClassId = null
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this.currentClassId) return
    const delay = Math.min(this.backoffMs, 10000)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.backoffMs = Math.min(this.backoffMs * 1.5, 10000)
      if (this.currentClassId) {
        this.connect(this.currentClassId)
      }
    }, delay)
  }

  public subscribe(cb: RealtimeCallback): () => void {
    this.listeners.add(cb)
    return () => {
      this.listeners.delete(cb)
    }
  }

  private notify(event: { type: string; [key: string]: any }) {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (err) {
        console.error("[Realtime] Error running listener:", err)
      }
    }
  }
}

export const realtimeClient = new RealtimeClient()

/**
 * Hook kết nối SSE theo lớp học hiện tại của người dùng
 */
export function useRealtimeConnection() {
  const { activeClass } = useStore()

  useEffect(() => {
    if (activeClass?.id) {
      realtimeClient.connect(activeClass.id)
    } else {
      realtimeClient.disconnect()
    }

    return () => {
      // Không disconnect ngay để giữ kết nối xuyên suốt các trang
    }
  }, [activeClass?.id])
}

/**
 * Hook lắng nghe sự kiện real-time hoặc sự kiện quay lại tab (Focus)
 * @param onRefresh Callback thực hiện nạp lại dữ liệu
 * @param eventTypes Mảng các loại sự kiện cần lắng nghe (để trống để lắng nghe tất cả)
 */
export function useRealtimeRefresh(
  onRefresh: (event?: any) => void,
  eventTypes?: string[],
) {
  const cbRef = useRef(onRefresh)
  cbRef.current = onRefresh

  useEffect(() => {
    const unsubscribe = realtimeClient.subscribe((event) => {
      if (event.type === "CONNECTED") return

      // Nếu có chỉ định eventTypes, kiểm tra type có khớp không
      if (
        !eventTypes ||
        eventTypes.length === 0 ||
        eventTypes.includes(event.type) ||
        event.type === "WINDOW_FOCUS_REFRESH"
      ) {
        cbRef.current(event)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [eventTypes ? eventTypes.join(",") : "all"])
}
