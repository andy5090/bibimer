"""Guest-only math diagnostics for the original standalone Bun runtimes."""
import json
import os
from pathlib import Path
import subprocess

if os.uname().sysname != 'Linux' or os.uname().machine != 'aarch64' or not Path('/etc/alpine-release').is_file():
    raise SystemExit('Run only inside the bundled ARM64 Alpine guest')

script = r'''
const cases = [
  ['floor negative integer', Math.floor(-7), -7],
  ['floor negative fraction', Math.floor(-7.25), -8],
  ['ceil negative fraction', Math.ceil(-7.25), -7],
  ['trunc negative fraction', Math.trunc(-7.25), -7],
  ['round negative fraction', Math.round(-7.25), -7],
  ['floor positive', Math.floor(7.25), 7],
  ['negative lower bound', -7 >= -9000000000000000, true],
  ['negative upper bound', -7 <= 0, true],
  ['strict floor equality', Math.floor(-7) === -7, true],
  ['strict dynamic equality', [-7, -99, -1].every(v => Math.floor(v) === v), true],
  ['signed coercion', Math.floor(-7) | 0, -7],
  ['decimal validation', Math.floor(-7) === -7 && -7 >= -9000000000000000 && -7 <= 0, true],
  ['negative zero', Object.is(Math.floor(-0), -0), true],
  ['double addition', -7.25 + 3.5, -3.75],
  ['double multiplication', -7.25 * 2, -14.5],
  ['division', 21 / -3, -7],
  ['parse negative', Number('-7'), -7],
  ['pow negative', Math.pow(-7, 2), 49]
];
let failures = 0;
for (const [name,actual,expected] of cases) {
  const passed = Object.is(actual,expected);
  console.log('GUEST_MATH', JSON.stringify({name,actual,expected,passed}));
  if (!passed) failures++;
}
console.log('GUEST_MATH_RESULT', JSON.stringify({runtime:typeof Bun === 'object' ? Bun.version : process.version, failures}));
process.exit(failures ? 1 : 0);
'''
base = Path('/root/bibimer-probe')
programs = [
    ('node', Path('/usr/bin/node')),
    ('bun-1.3.10', Path('/root/bibimer-probe-opencode-1.2.27/opencode/node_modules/opencode-linux-arm64-musl/bin/opencode')),
    ('bun-1.3.14', base / 'opencode/node_modules/opencode-linux-arm64-musl/bin/opencode'),
]
failures = []
env = {key:value for key,value in os.environ.items() if key in ('HOME','PATH','LANG','LC_ALL','TERM')}
env.update(BUN_BE_BUN='1', JSC_useJIT='0')
for name, program in programs:
    print('GUEST_MATH_START', name, flush=True)
    if not program.is_file():
        failures.append(name + ': absent'); continue
    try:
        result = subprocess.run([str(program), '-e', script], env=env, timeout=45)
        if result.returncode: failures.append(name + ': exit ' + str(result.returncode))
    except subprocess.TimeoutExpired:
        failures.append(name + ': timeout')
if failures:
    raise RuntimeError(json.dumps(failures))
print('bun_math_ok', flush=True)
