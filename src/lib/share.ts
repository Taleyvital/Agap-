function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
  /** Files to share — only supported on web via navigator.share */
  files?: File[];
}

export async function share(options: ShareOptions): Promise<void> {
  if (isNativePlatform()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({
      title: options.title ?? "AGAPE",
      text: options.text,
      url: options.url ?? "https://agape.app",
      dialogTitle: options.dialogTitle ?? "Partager",
    });
    return;
  }

  if (!navigator.share) return;

  if (options.files && options.files.length > 0 && navigator.canShare?.({ files: options.files })) {
    await navigator.share({ files: options.files, title: options.title, text: options.text });
  } else {
    await navigator.share({ title: options.title, text: options.text, url: options.url });
  }
}
