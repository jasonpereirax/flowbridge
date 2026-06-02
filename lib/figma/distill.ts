// Back-compat shim. The comprehensive extractor lives in ./extract.
// Existing call sites import `distillFigmaStructure`; it now resolves to the
// full design-spec extractor (auto-layout, typography, fills, effects, tokens).
export { extractDesignSpec as distillFigmaStructure } from './extract'
