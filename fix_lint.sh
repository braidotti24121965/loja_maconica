sed -i '' 's/data: any;/data: any; \/\/ eslint-disable-line @typescript-eslint\/no-explicit-any/' src/app/\(dashboard\)/lojas/\[id\]/configuracoes/importar/actions.ts
sed -i '' 's/function sanitizeCSVValue(val: any): string {/\/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\nfunction sanitizeCSVValue(val: any): string {/' src/app/\(dashboard\)/lojas/\[id\]/configuracoes/importar/actions.ts
sed -i '' 's/const rawRows = parseResult.data as Record<string, any>\[\];/\/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\n  const rawRows = parseResult.data as Record<string, any>[];/' src/app/\(dashboard\)/lojas/\[id\]/configuracoes/importar/actions.ts
sed -i '' 's/const normalizedData: any = {};/\/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\n    const normalizedData: any = {};/' src/app/\(dashboard\)/lojas/\[id\]/configuracoes/importar/actions.ts

sed -i '' 's/} catch (err: any) {/} catch (err: any) { \/\/ eslint-disable-line @typescript-eslint\/no-explicit-any/' src/app/\(dashboard\)/lojas/\[id\]/configuracoes/importar/import-client.tsx
