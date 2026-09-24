/**
 * Cross-platform Share Utility for TruFit Profiles, Matches, and Social Posts
 * Supports native Web Share API on mobile & modern browsers, with clipboard fallback.
 */

export interface ShareData {
  title: string;
  text?: string;
  url?: string;
}

export interface ShareResult {
  success: boolean;
  method: 'native' | 'clipboard' | 'failed';
  message?: string;
}

export async function shareContent(data: ShareData): Promise<ShareResult> {
  const shareUrl = data.url || window.location.href;
  const payload = {
    title: data.title || 'TruFit Sports',
    text: data.text || 'Check this out on TruFit!',
    url: shareUrl,
  };

  // 1. Try Native Navigator Share if available and supported
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      // Check canShare if available
      if (typeof navigator.canShare === 'function') {
        if (navigator.canShare(payload)) {
          await navigator.share(payload);
          return { success: true, method: 'native' };
        }
      } else {
        await navigator.share(payload);
        return { success: true, method: 'native' };
      }
    } catch (err: any) {
      // User cancelled share dialog -> return graceful cancelled state
      if (err.name === 'AbortError') {
        return { success: false, method: 'native', message: 'Share dismissed' };
      }
      console.warn('Native share failed, falling back to clipboard:', err);
    }
  }

  // 2. Fallback to Clipboard Copy
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(shareUrl);
      return {
        success: true,
        method: 'clipboard',
        message: 'Link copied to clipboard!',
      };
    } catch (clipErr) {
      console.warn('Clipboard write failed:', clipErr);
    }
  }

  // 3. Fallback for older browsers using hidden textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = shareUrl;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      return {
        success: true,
        method: 'clipboard',
        message: 'Link copied to clipboard!',
      };
    }
  } catch (legacyErr) {
    console.warn('Legacy copy command failed:', legacyErr);
  }

  return {
    success: false,
    method: 'failed',
    message: 'Sharing is not supported on this browser.',
  };
}
