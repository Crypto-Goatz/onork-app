import { toast } from 'sonner'

// Convenience wrappers for common toast patterns
export function notify(message: string) {
  toast(message)
}

export function success(message: string) {
  toast.success(message)
}

export function error(message: string) {
  toast.error(message)
}

export function loading(message: string) {
  return toast.loading(message)
}

export function dismiss(id: string | number) {
  toast.dismiss(id)
}

// Promise-based toast for async operations
export function promise<T>(
  fn: Promise<T>,
  opts: { loading: string; success: string; error: string }
) {
  return toast.promise(fn, opts)
}

// Common patterns
export const toasts = {
  saving: () => toast.loading('Saving...'),
  saved: () => toast.success('Saved'),
  deleted: () => toast.success('Deleted'),
  copied: () => toast.success('Copied to clipboard'),
  exportStarted: () => toast.loading('Preparing export...'),
  exportReady: () => toast.success('Export ready — downloading now'),
  uploadStarted: () => toast.loading('Uploading...'),
  uploaded: () => toast.success('Upload complete'),
  connectionSuccess: (name: string) => toast.success(`Connected to ${name}`),
  connectionFailed: (name: string) => toast.error(`Failed to connect to ${name}`),
  postPublished: (platform: string) => toast.success(`Published to ${platform}`),
  postFailed: (platform: string) => toast.error(`Failed to post to ${platform}`),
  scanStarted: () => toast.loading('Scanning...'),
  scanComplete: (score: number) => toast.success(`Scan complete — score: ${score}`),
  paymentSuccess: () => toast.success('Payment successful'),
  unauthorized: () => toast.error('Please log in to continue'),
  networkError: () => toast.error('Network error — check your connection'),
}

// Re-export toast for direct usage
export { toast }
