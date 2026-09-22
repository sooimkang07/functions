"""Build a local review candidate; no upload or publication."""
from pathlib import Path
import hashlib, json, shutil, zipfile
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root/'manifest.json').read_text())
version = manifest['version']
files = ['manifest.json', 'index.html', 'welcome.html']
for directory, suffixes in [('scripts', {'.js'}), ('styles', {'.css'}), ('images', {'.png', '.svg'})]:
    files.extend(str(p.relative_to(root)) for p in sorted((root/directory).iterdir()) if p.suffix in suffixes)
fingerprints = {name: hashlib.sha256((root/name).read_bytes()).hexdigest() for name in files}
build_id = hashlib.sha256(json.dumps(fingerprints, sort_keys=True).encode()).hexdigest()[:12]
out = root/'release'/f'notate-{version}-{build_id}'
out.mkdir(parents=True, exist_ok=True)
for name in files:
    target = out/'extension'/name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(root/name, target)
archive = out/f'notate-{version}-candidate.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in files:
        z.write(out/'extension'/name, name)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert sorted(z.namelist()) == sorted(files)
    for name in files:
        assert hashlib.sha256(z.read(name)).hexdigest() == fingerprints[name]
(out/'build.json').write_text(json.dumps({'version':version,'buildId':build_id,'status':'candidate — staged Chrome QA required','files':fingerprints},indent=2)+'\n')
print(archive)
print(f'{len(files)} files; ZIP integrity and source hashes verified.')
