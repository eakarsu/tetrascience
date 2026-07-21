import { validateRuntime } from '../../src/core/runtime';
const original={...process.env};afterEach(()=>{for(const key of Object.keys(process.env))if(!(key in original))delete process.env[key];Object.assign(process.env,original);});
test('rejects weak JWT secrets in every environment',()=>{process.env.JWT_SECRET='weak';process.env.NODE_ENV='test';expect(()=>validateRuntime()).toThrow(/at least 32/);});
test('production requires an explicit non-wildcard origin',()=>{Object.assign(process.env,{NODE_ENV:'production',JWT_SECRET:'a'.repeat(32),DATABASE_URL:'postgresql://invalid',CORS_ORIGINS:'*'});expect(()=>validateRuntime()).toThrow(/explicit production origins/);});
test('fails closed if a legacy AI or demo route flag is enabled',()=>{Object.assign(process.env,{NODE_ENV:'test',JWT_SECRET:'a'.repeat(32),ENABLE_AI:'false',ENABLE_DEMO_ROUTES:'true'});expect(()=>validateRuntime()).toThrow(/unsupported/);});
