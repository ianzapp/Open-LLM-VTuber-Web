export interface ModelPath {
  dir: string;
  fileName: string;
}

const missing = (value: string | undefined): boolean => !value || value === 'undefined';

/** Where to load a model from, or null while the server has not sent a model yet. */
export function resolveModelPath(
  resourcesPath: string,
  modelDir: string[],
  modelFileNames: string[] | undefined,
  index: number,
): ModelPath | null {
  const dir = modelDir[index];
  if (missing(dir)) return null;
  const name = (modelFileNames && modelFileNames[index]) || dir;
  if (missing(name)) return null;
  return { dir: `${resourcesPath}${dir}/`, fileName: `${name}.model3.json` };
}
