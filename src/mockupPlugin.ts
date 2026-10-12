import fs from 'fs';
import path from 'path';

export function mockupPlugin() {
  const mockupDir = path.resolve(__dirname, 'components/mockups');
  const outFile = path.resolve(__dirname, '.generated/mockup-components.ts');

  function generate() {
    if (!fs.existsSync(mockupDir)) fs.mkdirSync(mockupDir, { recursive: true });
    if (!fs.existsSync(path.dirname(outFile))) fs.mkdirSync(path.dirname(outFile), { recursive: true });
    const files = fs.readdirSync(mockupDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
    const imports = files.map(f => {
      const name = path.basename(f, path.extname(f));
      return `  "./components/mockups/${name}.tsx": () => import("@/components/mockups/${name}"),`;
    }).join('\n');
    const content = `// auto-generated\ntype ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;\nexport const modules: ModuleMap = {\n${imports}\n};\n`;
    fs.writeFileSync(outFile, content);
    console.log(`[mockupPlugin] Generated ${files.length} mockups`);
  }

  return {
    name: 'mockup-plugin',
    buildStart() { generate(); },
    configureServer(server: any) {
      const watcher = fs.watch(mockupDir, () => generate());
      server.httpServer?.on('close', () => watcher.close());
    }
  };
}
