import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

/**
 * AppErrorBoundary — ครอบ /app route ทั้งหมด
 * ถ้า React #185 หรือ error อื่นๆ เกิดขึ้น จะแสดงข้อความที่อ่านได้
 * แทนที่จะเป็นหน้าขาวเปล่า
 *
 * Component stack ใน error message บอกเราว่า component ไหนที่ก่อปัญหา
 */
export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? null });
    console.error("[AppErrorBoundary] caught error:", error);
    console.error("[AppErrorBoundary] component stack:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const isMaxUpdateDepth =
        this.state.error?.message?.includes("Maximum update depth") ||
        this.state.error?.message?.includes("185");

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-2xl w-full space-y-4">
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
              <h1 className="text-lg font-bold text-destructive mb-1">
                {isMaxUpdateDepth ? "⚠️ React Loop Error (#185)" : "⚠️ App Error"}
              </h1>
              <p className="text-sm text-muted-foreground mb-4">
                {isMaxUpdateDepth
                  ? "พบ infinite re-render loop — component กำลังเรียก setState ซ้ำๆ ใน useEffect"
                  : "เกิด error ใน CRM App"}
              </p>

              <div className="rounded-lg bg-muted/60 p-3 text-xs font-mono text-foreground/80 overflow-auto max-h-32">
                <strong>Error:</strong> {this.state.error?.message}
              </div>

              {this.state.componentStack && (
                <details className="mt-3">
                  <summary className="text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground">
                    Component Stack (คลิกเพื่อดูว่า component ไหนเป็นต้นเหตุ)
                  </summary>
                  <pre className="mt-2 text-[10px] font-mono bg-muted/60 p-3 rounded overflow-auto max-h-48 text-foreground/70 whitespace-pre-wrap">
                    {this.state.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, componentStack: null });
                }}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg border hover:bg-muted transition-colors"
              >
                ลองใหม่
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = "/login";
                }}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                ล้าง Cache แล้ว Login ใหม่
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
