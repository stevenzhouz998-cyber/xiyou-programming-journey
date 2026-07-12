export function downloadTextFile(filename: string, contents: string, mime: string): void {
  let url: string | null = null;
  let anchor: HTMLAnchorElement | null = null;
  let primaryError: unknown;
  try {
    url = URL.createObjectURL(new Blob([contents], { type: mime }));
    anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
  } catch (error) {
    primaryError = error;
  } finally {
    try { anchor?.remove(); } catch (error) { primaryError ??= error; }
    if (url !== null) try { URL.revokeObjectURL(url); } catch (error) { primaryError ??= error; }
  }
  if (primaryError !== undefined) throw primaryError;
}
