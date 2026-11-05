const fs=require('fs'),vm=require('vm'),path=require('path');
const base=path.resolve(__dirname,'..');
for(const file of ['src/natural-editor.js','src/decimal15.js','src/display.js','src/kernel.js','src/state-machine.js','src/numerical.js','src/modes.js','src/c-edition.js','src/reference.js','src/differential.js','src/release-audit.js','tests/cases.js'])vm.runInThisContext(fs.readFileSync(path.join(base,file),'utf8'),{filename:file});
const report=globalThis.FX991_TESTS.run();console.log(`${report.passed}/${report.total} tests passed`);for(const t of report.details.filter(x=>!x.pass))console.log('FAIL',t.name,t.error);if(report.failed)process.exitCode=1;
